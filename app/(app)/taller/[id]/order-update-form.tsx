"use client";

import { useActionState, useState } from "react";
import { updateOrderAction } from "../actions";
import type { FormState } from "../../equipos/actions";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { REPAIR_STATUSES, statusLabel } from "@/lib/status";

type Values = Record<
  "status" | "technicianId" | "budgetNumber" | "budgetDate" | "budget" | "cost" | "deliveredAt" | "deliveryRemito" | "comments",
  string
>;

export function OrderUpdateForm({
  orderId,
  receivedAt,
  today,
  technicians,
  initial,
}: {
  orderId: string;
  receivedAt: string;
  today: string;
  technicians: { id: string; full_name: string }[];
  initial: Values;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateOrderAction.bind(null, orderId, receivedAt),
    {},
  );
  const v = { ...initial, ...(state.values ?? {}) } as Values;
  // key: con cada respuesta el formulario se arma de nuevo con los valores que devolvió el servidor
  return <Inner key={state.stamp ?? 0} {...{ action, pending, state, v, receivedAt, today, technicians }} />;
}

function Inner({
  action,
  pending,
  state,
  v,
  receivedAt,
  today,
  technicians,
}: {
  action: (f: FormData) => void;
  pending: boolean;
  state: FormState;
  v: Values;
  receivedAt: string;
  today: string;
  technicians: { id: string; full_name: string }[];
}) {
  const err = state.errors ?? {};
  const [status, setStatus] = useState(v.status);
  const showDelivery = status === "entregado" || Boolean(v.deliveredAt);
  const inv = (k: string) => ({
    "aria-invalid": err[k] ? true : undefined,
    "aria-describedby": err[k] ? `${k}-error` : undefined,
  });

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && <Alert tone={state.errors ? "danger" : "success"}>{state.message}</Alert>}
      <Field label="Estado" htmlFor="status">
        <Select id="status" name="status" defaultValue={v.status} onChange={(e) => setStatus(e.target.value)}>
          {REPAIR_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel("repair", s)}</option>
          ))}
        </Select>
      </Field>
      <Field label="Técnico" htmlFor="technicianId">
        <Select id="technicianId" name="technicianId" defaultValue={v.technicianId}>
          <option value="">Sin asignar</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nº presupuesto" htmlFor="budgetNumber" error={err.budgetNumber}>
          <Input id="budgetNumber" name="budgetNumber" defaultValue={v.budgetNumber} {...inv("budgetNumber")} />
        </Field>
        <Field label="Fecha presupuesto" htmlFor="budgetDate" error={err.budgetDate}>
          <Input id="budgetDate" name="budgetDate" type="date" defaultValue={v.budgetDate} min={receivedAt} {...inv("budgetDate")} />
        </Field>
        <Field label="Presupuesto ($)" htmlFor="budget" error={err.budget}>
          <Input id="budget" name="budget" inputMode="decimal" defaultValue={v.budget} placeholder="100.000" {...inv("budget")} />
        </Field>
        <Field label="Costo ($)" htmlFor="cost" error={err.cost}>
          <Input id="cost" name="cost" inputMode="decimal" defaultValue={v.cost} placeholder="100.000" {...inv("cost")} />
        </Field>
      </div>
      {showDelivery && (
        <div className="grid grid-cols-2 gap-3 rounded-md bg-surface p-3">
          <Field label="Fecha de salida" htmlFor="deliveredAt" required={status === "entregado"} error={err.deliveredAt}>
            <Input
              id="deliveredAt"
              name="deliveredAt"
              type="date"
              defaultValue={v.deliveredAt || (status === "entregado" ? today : "")}
              min={receivedAt}
              max={today}
              {...inv("deliveredAt")}
            />
          </Field>
          <Field label="Remito de entrega" htmlFor="deliveryRemito" error={err.deliveryRemito}>
            <Input id="deliveryRemito" name="deliveryRemito" defaultValue={v.deliveryRemito} {...inv("deliveryRemito")} />
          </Field>
        </div>
      )}
      <Field label="Comentarios internos" htmlFor="comments" error={err.comments}>
        <Textarea id="comments" name="comments" rows={3} defaultValue={v.comments} {...inv("comments")} />
      </Field>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
      <p className="text-xs text-muted">Cada cambio de estado se anota solo en la hoja de vida, con tu nombre.</p>
    </form>
  );
}
