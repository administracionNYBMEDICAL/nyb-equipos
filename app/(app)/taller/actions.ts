"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { addBudgetFile, createRepairOrder, OpenOrderExists, removeBudgetFile, updateRepairIntake, updateRepairOrder } from "@/lib/data";
import { parseMoney, todayAR } from "@/lib/format";
import { REPAIR_STATUSES } from "@/lib/status";
import type { FormState } from "../equipos/actions";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const optText = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

const NewOrder = z.object({
  equipmentId: uuid,
  receivedAt: date,
  pickupRemito: optText(40),
  accessoriesIn: optText(500),
  reportedFault: optText(500),
  technicianId: z.union([uuid, z.literal("")]),
});

export async function createOrderAction(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const values = Object.fromEntries(Object.keys(NewOrder.shape).map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = NewOrder.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors, values, message: "Revisá los campos marcados." };
  }
  let created;
  try {
    created = await createRepairOrder(staff.id, parsed.data);
  } catch (e) {
    if (e instanceof OpenOrderExists) return { values, message: `Este equipo ya tiene la orden ${e.message} abierta.` };
    throw e;
  }
  revalidatePath("/taller");
  redirect(`/taller/${created.id}?nueva=1`);
}

const Update = z
  .object({
    status: z.enum(REPAIR_STATUSES),
    technicianId: z.union([uuid, z.literal("")]),
    budgetNumber: optText(40),
    budgetDate: z.union([date, z.literal("")]),
    budget: optText(30),
    cost: optText(30),
    deliveredAt: z.union([date, z.literal("")]),
    deliveryRemito: optText(40),
    comments: optText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.status === "entregado" && !v.deliveredAt)
      ctx.addIssue({ code: "custom", path: ["deliveredAt"], message: "Para marcarlo entregado, cargá la fecha de salida." });
  });

export async function updateOrderAction(orderId: string, receivedAt: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const values = Object.fromEntries(
    ["status", "technicianId", "budgetNumber", "budgetDate", "budget", "cost", "deliveredAt", "deliveryRemito", "comments"].map(
      (k) => [k, String(form.get(k) ?? "")],
    ),
  );
  const parsed = Update.safeParse(values);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  const budgetCents = parseMoney(values.budget);
  const costCents = parseMoney(values.cost);
  if (Number.isNaN(budgetCents)) errors.budget = "Escribí solo el número, por ejemplo 100.000";
  if (Number.isNaN(costCents)) errors.cost = "Escribí solo el número, por ejemplo 100.000";
  if (values.deliveredAt && values.deliveredAt < receivedAt) errors.deliveredAt = "La salida no puede ser antes del ingreso.";
  if (Object.keys(errors).length || !parsed.success) return { errors, values, message: "Revisá los campos marcados.", stamp: Date.now() };

  const d = parsed.data;
  const equipmentId = await updateRepairOrder(staff.id, orderId, {
    status: d.status,
    technicianId: d.technicianId || null,
    budgetNumber: d.budgetNumber,
    budgetDate: d.budgetDate,
    budgetCents,
    costCents,
    deliveredAt: d.deliveredAt,
    deliveryRemito: d.deliveryRemito,
    comments: d.comments,
  });
  revalidatePath(`/taller/${orderId}`);
  revalidatePath("/taller");
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: "Orden guardada.", values, stamp: Date.now() };
}

const Intake = z.object({
  receivedAt: date,
  pickupRemito: optText(40),
  accessoriesIn: optText(500),
  reportedFault: optText(500),
});

export async function updateIntakeAction(orderId: string, deliveredAt: string | null, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const values = Object.fromEntries(Object.keys(Intake.shape).map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = Intake.safeParse(values);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  if (values.receivedAt && values.receivedAt > todayAR()) errors.receivedAt = "La fecha de ingreso no puede ser posterior a hoy.";
  if (values.receivedAt && deliveredAt && values.receivedAt > deliveredAt)
    errors.receivedAt = "La fecha de ingreso no puede ser posterior a la de salida.";
  if (Object.keys(errors).length || !parsed.success) return { errors, values, message: "Revisá los campos marcados.", stamp: Date.now() };
  const equipmentId = await updateRepairIntake(staff.id, orderId, parsed.data);
  revalidatePath(`/taller/${orderId}`);
  revalidatePath("/taller");
  revalidatePath(`/equipos/${equipmentId}`);
  return { message: "Datos del ingreso corregidos. Quedó anotado en la hoja de vida.", stamp: Date.now() };
}

const MAX_PDF = 4_000_000;

export async function uploadBudgetAction(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const fail = (file: string): FormState => ({ errors: { file }, stamp: Date.now() });
  const file = form.get("file");
  if (!uuid.safeParse(orderId).success) return fail("Orden inválida.");
  if (!(file instanceof File) || file.size === 0) return fail("Elegí un PDF.");
  if (file.size > MAX_PDF) return fail("El PDF es muy pesado (máximo 4 MB).");
  const data = Buffer.from(await file.arrayBuffer());
  // se mira el contenido: la extensión y el tipo los puede informar mal el celular
  if (!data.subarray(0, 1024).includes("%PDF-")) return fail("El archivo no es un PDF válido.");
  const name = (file.name.split(/[\/]/).pop() ?? "").replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(-200) || "presupuesto.pdf";
  try {
    await addBudgetFile(staff.id, orderId, name, data);
  } catch (e) {
    console.error("uploadBudgetAction", e);
    return fail("No se pudo guardar el PDF. Probá de nuevo en un momento.");
  }
  revalidatePath(`/taller/${orderId}`);
  return { message: "Presupuesto guardado.", stamp: Date.now() };
}

export async function removeBudgetAction(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const parsed = uuid.safeParse(String(form.get("fileId") ?? ""));
  if (!parsed.success || !uuid.safeParse(orderId).success) return { errors: { file: "Archivo inválido." }, stamp: Date.now() };
  const ok = await removeBudgetFile(staff.id, orderId, parsed.data);
  if (!ok) return { errors: { file: "Ese archivo ya no está." }, stamp: Date.now() };
  revalidatePath(`/taller/${orderId}`);
  return { message: "Presupuesto quitado.", stamp: Date.now() };
}
