"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createOrderAction } from "../actions";
import type { FormState } from "../../equipos/actions";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

export function OrderForm({
  equipmentId,
  today,
  technicians,
  currentUserId,
}: {
  equipmentId: string;
  today: string;
  technicians: { id: string; full_name: string }[];
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createOrderAction, {});
  const v = state.values ?? {};
  const err = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="equipmentId" value={equipmentId} />
      {state.message && <Alert>{state.message}</Alert>}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de ingreso" htmlFor="receivedAt" required error={err.receivedAt}>
            <Input id="receivedAt" name="receivedAt" type="date" defaultValue={v.receivedAt || today} max={today} required />
          </Field>
          <Field label="Nº de remito de retiro" htmlFor="pickupRemito" hint="Si no hay remito, dejalo vacío." error={err.pickupRemito}>
            <Input id="pickupRemito" name="pickupRemito" defaultValue={v.pickupRemito} inputMode="numeric" />
          </Field>
          <Field label="Falla o motivo del ingreso" htmlFor="reportedFault" className="sm:col-span-2" error={err.reportedFault}>
            <Textarea id="reportedFault" name="reportedFault" rows={2} defaultValue={v.reportedFault} placeholder="No calienta · Service 5.000 hs · Service anual…" />
          </Field>
          <Field
            label="Accesorios con los que entra"
            htmlFor="accessoriesIn"
            className="sm:col-span-2"
            hint="Así queda constancia de qué hay que devolver."
            error={err.accessoriesIn}
          >
            <Textarea id="accessoriesIn" name="accessoriesIn" rows={2} defaultValue={v.accessoriesIn} placeholder="Válvula exhalatoria, cable de línea… o “sin accesorios”" />
          </Field>
          <Field label="Técnico a cargo" htmlFor="technicianId" error={err.technicianId}>
            <Select id="technicianId" name="technicianId" defaultValue={v.technicianId ?? currentUserId}>
              <option value="">Sin asignar</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Link href="/taller" className="inline-flex h-12 items-center px-4 text-sm font-semibold text-accent-strong">Cancelar</Link>
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
          {pending ? "Registrando…" : "Registrar ingreso"}
        </Button>
      </div>
    </form>
  );
}
