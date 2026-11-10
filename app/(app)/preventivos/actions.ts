"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { registerPreventive, reschedulePreventive, setReportPublic } from "@/lib/data";
import { todayAR } from "@/lib/format";
import type { FormState } from "../equipos/actions";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const MAX_PDF = 4_000_000;

const NewPreventive = z.object({
  equipmentId: uuid,
  executedOn: date,
  result: z.enum(["apto", "no_apto"], { message: "Indicá si quedó apto o no apto" }),
  reportNumber: z.string().trim().max(40, "Máximo 40 caracteres"),
  intervalMonths: z.coerce.number({ message: "Escribí un número de meses" }).int("Escribí un número entero").min(1, "Mínimo 1 mes").max(60, "Máximo 60 meses"),
  nextDueOn: date,
});

export async function registerPreventiveAction(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const keys = ["equipmentId", "executedOn", "result", "reportNumber", "intervalMonths", "nextDueOn"] as const;
  const values: Record<string, string> = Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
  values.publicOnQr = form.get("publicOnQr") === "on" ? "on" : "";
  const errors: Record<string, string> = {};
  const parsed = NewPreventive.safeParse(values);
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;

  const today = todayAR();
  if (parsed.success) {
    if (parsed.data.executedOn > today) errors.executedOn = "La fecha de realización no puede ser posterior a hoy.";
    if (parsed.data.nextDueOn <= parsed.data.executedOn) errors.nextDueOn = "Tiene que ser posterior a la fecha de realización.";
  }

  const file = form.get("file");
  let pdf: { name: string; data: Buffer } | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PDF) errors.file = "El PDF es muy pesado (máximo 4 MB).";
    else {
      const data = Buffer.from(await file.arrayBuffer());
      if (!data.subarray(0, 1024).includes("%PDF-")) errors.file = "El archivo no es un PDF válido.";
      else {
        const name = (file.name.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(-200) || "informe.pdf";
        pdf = { name, data };
      }
    }
  }

  if (Object.keys(errors).length || !parsed.success) {
    const withFile = pdf || errors.file;
    return {
      errors,
      values,
      message: "Revisá los campos marcados." + (withFile && !errors.file ? " Volvé a elegir el PDF del informe." : ""),
      stamp: Date.now(),
    };
  }

  const d = parsed.data;
  let saved;
  try {
    saved = await registerPreventive(staff.id, {
      equipmentId: d.equipmentId,
      executedOn: d.executedOn,
      passed: d.result === "apto",
      reportNumber: d.reportNumber,
      intervalMonths: d.intervalMonths,
      nextDueOn: d.nextDueOn,
      file: pdf,
      publicOnQr: Boolean(pdf) && values.publicOnQr === "on",
    });
  } catch (e) {
    console.error("registerPreventiveAction", e);
    return { values, message: "No se pudo guardar el preventivo. Probá de nuevo en un momento.", stamp: Date.now() };
  }
  revalidatePath("/preventivos");
  revalidatePath(`/equipos/${d.equipmentId}`);
  redirect(`/preventivos/nuevo?ok=${encodeURIComponent(saved.code)}&equipo_ok=${d.equipmentId}`);
}

const Reschedule = z.object({
  intervalMonths: z.coerce.number({ message: "Escribí un número de meses" }).int("Escribí un número entero").min(1, "Mínimo 1 mes").max(60, "Máximo 60 meses"),
  nextDueOn: date,
});

export async function rescheduleAction(equipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const values = { intervalMonths: String(form.get("intervalMonths") ?? ""), nextDueOn: String(form.get("nextDueOn") ?? "") };
  const parsed = Reschedule.safeParse(values);
  if (!parsed.success || !uuid.safeParse(equipmentId).success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error?.issues ?? []) errors[String(i.path[0])] ??= i.message;
    return { errors, values, message: "Revisá los campos marcados.", stamp: Date.now() };
  }
  await reschedulePreventive(staff.id, equipmentId, parsed.data.intervalMonths, parsed.data.nextDueOn);
  revalidatePath(`/equipos/${equipmentId}`);
  revalidatePath("/preventivos");
  return { message: "Próximo preventivo actualizado.", values, stamp: Date.now() };
}

export async function toggleReportPublicAction(fileId: string, visible: boolean): Promise<FormState> {
  const staff = await requireStaff();
  const equipmentId = await setReportPublic(staff.id, fileId, visible);
  if (!equipmentId) return { message: "Ese informe ya no está.", stamp: Date.now() };
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: visible ? "El cliente ya puede ver el informe en el QR." : "El informe ya no se ve en el QR.", stamp: Date.now() };
}
