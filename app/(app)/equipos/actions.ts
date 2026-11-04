"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { addNote, createEquipment, setEquipmentStatus } from "@/lib/data";
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
});

export async function createEquipmentAction(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const values = Object.fromEntries(
    Object.keys(EquipmentSchema.shape).map((k) => [k, String(form.get(k) ?? "")]),
  ) as Record<string, string>;
  const parsed = EquipmentSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors, values, message: "Revisá los campos marcados." };
  }
  const serial = parsed.data.serial;
  if (/^(s\/?n|sin n(u|ú)mero|sin numero|-+)$/i.test(serial)) parsed.data.serial = "";

  let created: { id: string; code: string };
  try {
    created = await createEquipment(staff.id, parsed.data);
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505" && err.constraint === "equipment_serial_uq") {
      const dup = await asUser(staff.id, async (tx) =>
        (
          await tx.query(
            `select id, code from equipment where lower(coalesce(brand,'')) = lower($1) and lower(coalesce(model,'')) = lower($2) and lower(serial) = lower($3)`,
            [parsed.data.brand, parsed.data.model, parsed.data.serial],
          )
        ).rows[0],
      );
      return {
        values,
        errors: { serial: "Ya hay un equipo con esta marca, modelo y serial." },
        duplicate: dup,
        message: "Este equipo ya está cargado.",
      };
    }
    throw e;
  }
  revalidatePath("/equipos");
  if (form.get("ingresar") === "on") redirect(`/taller/nuevo?equipo=${created.id}`);
  redirect(`/equipos/${created.id}?nuevo=1`);
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
