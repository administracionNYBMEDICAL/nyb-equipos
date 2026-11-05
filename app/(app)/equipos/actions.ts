"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { addNote, createEquipment, regenerateQr, setEquipmentStatus, setPhoto, updateEquipment } from "@/lib/data";
import { asUser } from "@/lib/db";
import { EQUIPMENT_STATUSES } from "@/lib/status";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
  duplicate?: { id: string; code: string };
  /** Cambia en cada envío: los formularios lo usan como key para reiniciarse con los valores devueltos. */
  stamp?: number;
};

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

const EquipmentSchema = z.object({
  clientName: text(120).min(2, "Indicá el cliente"),
  siteName: text(120),
  sector: text(80),
  equipmentType: text(80).min(2, "Indicá el tipo de equipo"),
  brand: text(80),
  model: text(80),
  serial: text(80),
  assetNumber: text(60),
  umdnsCode: text(20),
  notes: text(1000),
  condition: z.enum(["", "propio", "comodato", "alquiler"]),
  classification: text(40),
  manufacturedOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")]),
  purchasedOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")]),
  warrantyUntil: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")]),
});

type ParsedEquipment = z.infer<typeof EquipmentSchema>;

function parseEquipment(form: FormData):
  | { ok: true; data: ParsedEquipment; values: Record<string, string> }
  | { ok: false; state: FormState } {
  const values = Object.fromEntries(
    Object.keys(EquipmentSchema.shape).map((k) => [k, String(form.get(k) ?? "")]),
  ) as Record<string, string>;
  const parsed = EquipmentSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, state: { errors, values, message: "Revisá los campos marcados.", stamp: Date.now() } };
  }
  const data = parsed.data;
  if (/^(s\/?n|sin n(u|ú)mero|-+)$/i.test(data.serial)) data.serial = "";
  if (data.manufacturedOn && data.purchasedOn && data.purchasedOn < data.manufacturedOn)
    return {
      ok: false,
      state: { errors: { purchasedOn: "La compra no puede ser antes de la fabricación." }, values, message: "Revisá los campos marcados.", stamp: Date.now() },
    };
  return { ok: true, data, values };
}

async function duplicateOf(uid: string, d: ParsedEquipment) {
  return asUser(uid, async (tx) =>
    (
      await tx.query(
        `select id, code from equipment where lower(coalesce(brand,'')) = lower($1) and lower(coalesce(model,'')) = lower($2) and lower(serial) = lower($3)`,
        [d.brand, d.model, d.serial],
      )
    ).rows[0],
  );
}

export async function createEquipmentAction(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const p = parseEquipment(form);
  if (!p.ok) return p.state;
  let created: { id: string; code: string };
  try {
    created = await createEquipment(staff.id, p.data);
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505" && err.constraint === "equipment_serial_uq") {
      return {
        values: p.values,
        errors: { serial: "Ya hay un equipo con esta marca, modelo y serial." },
        duplicate: await duplicateOf(staff.id, p.data),
        message: "Este equipo ya está cargado.",
        stamp: Date.now(),
      };
    }
    throw e;
  }
  revalidatePath("/equipos");
  if (form.get("ingresar") === "on") redirect(`/taller/nuevo?equipo=${created.id}`);
  redirect(`/equipos/${created.id}?nuevo=1`);
}

export async function updateEquipmentAction(equipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const p = parseEquipment(form);
  if (!p.ok) return p.state;
  try {
    await updateEquipment(staff.id, equipmentId, p.data);
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505" && err.constraint === "equipment_serial_uq") {
      return {
        values: p.values,
        errors: { serial: "Ya hay otro equipo con esta marca, modelo y serial." },
        duplicate: await duplicateOf(staff.id, p.data),
        message: "Ese serial ya pertenece a otro equipo.",
        stamp: Date.now(),
      };
    }
    throw e;
  }
  revalidatePath(`/equipos/${equipmentId}`);
  revalidatePath("/equipos");
  redirect(`/equipos/${equipmentId}?tab=datos&guardado=1`);
}

export async function regenerateQrAction(equipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  if (form.get("confirm") !== "on") return { errors: { confirm: "Marcá la casilla para confirmar." }, stamp: Date.now() };
  await regenerateQr(staff.id, equipmentId);
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: "Listo: imprimí la etiqueta nueva. La anterior ya no abre la ficha.", stamp: Date.now() };
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export async function uploadPhotoAction(equipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { errors: { photo: "Elegí una foto." }, stamp: Date.now() };
  if (!PHOTO_TYPES.includes(file.type)) return { errors: { photo: "La foto tiene que ser JPG, PNG o WebP." }, stamp: Date.now() };
  if (file.size > 1_500_000) return { errors: { photo: "La foto es muy pesada (máximo 1,5 MB)." }, stamp: Date.now() };
  try {
    await setPhoto(staff.id, equipmentId, file.type, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    console.error("uploadPhotoAction", e);
    return { errors: { photo: "No se pudo guardar la foto. Probá de nuevo en un momento." }, stamp: Date.now() };
  }
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: "Foto guardada.", stamp: Date.now() };
}

const StatusSchema = z.object({
  status: z.enum(EQUIPMENT_STATUSES),
  reason: z.string().trim().max(300),
});

export async function changeStatusAction(equipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const parsed = StatusSchema.safeParse({ status: form.get("status"), reason: String(form.get("reason") ?? "") });
  if (!parsed.success) return { message: "Elegí un estado válido.", stamp: Date.now() };
  if (parsed.data.status === "baja" && parsed.data.reason.length < 3)
    return { errors: { reason: "Para dar de baja, escribí el motivo." }, values: { status: parsed.data.status, reason: parsed.data.reason }, stamp: Date.now() };
  await setEquipmentStatus(staff.id, equipmentId, parsed.data.status, parsed.data.reason);
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: "Estado actualizado.", stamp: Date.now() };
}

export async function addNoteAction(equipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const note = String(form.get("note") ?? "").trim();
  if (note.length < 2) return { errors: { note: "Escribí la novedad." } };
  if (note.length > 2000) return { errors: { note: "Máximo 2000 caracteres." }, values: { note } };
  await addNote(staff.id, equipmentId, note, form.get("visible") === "on");
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: "Novedad agregada a la hoja de vida." };
}
