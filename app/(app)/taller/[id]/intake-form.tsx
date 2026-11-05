"use client";

import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { updateIntakeAction } from "../actions";
import type { FormState } from "../../equipos/actions";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

type Values = { receivedAt: string; pickupRemito: string; accessoriesIn: string; reportedFault: string };

export function IntakeForm({
  orderId,
  deliveredAt,
  today,
  initial,
}: {
  orderId: string;
  deliveredAt: string | null;
  today: string;
  initial: Values;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateIntakeAction.bind(null, orderId, deliveredAt), {});
  const v = { ...initial, ...(state.values ?? {}) } as Values;
  const err = state.errors ?? {};
  const inv = (k: string) => ({ "aria-invalid": err[k] ? true : undefined, "aria-describedby": err[k] ? `${k}-error` : undefined });
  return (
    <div key={state.stamp ?? 0} className="mt-4">
      {state.message && !state.errors && <Alert tone="success">{state.message}</Alert>}
      <details open={Boolean(state.errors)} className="group mt-3 rounded-md border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-accent-strong">
          <Pencil aria-hidden className="size-3.5" /> Corregir datos del ingreso
        </summary>
        <form action={action} className="flex flex-col gap-3 border-t border-border p-4" noValidate>
          {state.errors && state.message && <Alert>{state.message}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fecha de ingreso" htmlFor="intake-receivedAt" error={err.receivedAt}>
              <Input id="intake-receivedAt" name="receivedAt" type="date" defaultValue={v.receivedAt} max={deliveredAt ?? today} required {...inv("receivedAt")} />
            </Field>
            <Field label="Nº de remito de retiro" htmlFor="intake-pickupRemito" error={err.pickupRemito}>
              <Input id="intake-pickupRemito" name="pickupRemito" defaultValue={v.pickupRemito} {...inv("pickupRemito")} />
            </Field>
          </div>
          <Field label="Falla o motivo del ingreso" htmlFor="intake-reportedFault" error={err.reportedFault}>
            <Textarea id="intake-reportedFault" name="reportedFault" rows={2} defaultValue={v.reportedFault} {...inv("reportedFault")} />
          </Field>
          <Field label="Accesorios con los que entró" htmlFor="intake-accessoriesIn" error={err.accessoriesIn}>
            <Textarea id="intake-accessoriesIn" name="accessoriesIn" rows={2} defaultValue={v.accessoriesIn} {...inv("accessoriesIn")} />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
            {pending ? "Guardando…" : "Guardar corrección"}
          </Button>
        </form>
      </details>
    </div>
  );
}
