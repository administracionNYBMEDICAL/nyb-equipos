"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { addMonths } from "@/lib/dates";
import { registerPreventiveAction } from "../actions";
import type { FormState } from "../../equipos/actions";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

const MAX_PDF = 4_000_000;

export function PreventiveForm({ equipmentId, today, defaultInterval }: { equipmentId: string; today: string; defaultInterval: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(registerPreventiveAction, {});
  const v = state.values ?? {};
  const err = state.errors ?? {};
  const executed = useRef<HTMLInputElement>(null);
  const interval = useRef<HTMLInputElement>(null);
  const next = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  // la próxima fecha se calcula sola hasta que el usuario la cambia a mano
  const nextTouched = useRef(Boolean(v.nextDueOn));

  function recalc() {
    if (nextTouched.current || !executed.current || !interval.current || !next.current) return;
    const n = Number(interval.current.value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(executed.current.value) && Number.isInteger(n) && n >= 1 && n <= 60)
      next.current.value = addMonths(executed.current.value, n);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const f = file.current?.files?.[0];
    if (f && f.size > MAX_PDF) {
      e.preventDefault();
      window.alert("El PDF es muy pesado (máximo 4 MB).");
    }
  }

  return (
    <form key={state.stamp} action={action} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="equipmentId" value={equipmentId} />
      {state.message && <Alert>{state.message}</Alert>}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de realización" htmlFor="executedOn" required error={err.executedOn}>
            <Input ref={executed} id="executedOn" name="executedOn" type="date" defaultValue={v.executedOn || today} max={today} required onChange={recalc} />
          </Field>
          <Field label="Nº de informe" htmlFor="reportNumber" hint="Si no tiene número, dejalo vacío." error={err.reportNumber}>
            <Input id="reportNumber" name="reportNumber" defaultValue={v.reportNumber} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold">
              Resultado <span className="text-danger" aria-hidden>*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "apto", label: "Apto para uso" },
                { id: "no_apto", label: "No apto" },
              ].map((o) => (
                <label
                  key={o.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border-input px-4 text-sm has-checked:border-accent-strong has-checked:bg-accent-soft has-checked:font-semibold"
                >
                  <input type="radio" name="result" value={o.id} defaultChecked={v.result === o.id} required className="size-4 accent-accent-strong" />
                  {o.label}
                </label>
              ))}
            </div>
            {err.result && <p role="alert" className="mt-1 text-sm text-danger">{err.result}</p>}
          </fieldset>
          <Field label="Periodicidad (meses)" htmlFor="intervalMonths" required hint="12 = anual." error={err.intervalMonths}>
            <Input ref={interval} id="intervalMonths" name="intervalMonths" type="number" min={1} max={60} inputMode="numeric" defaultValue={v.intervalMonths || String(defaultInterval)} onChange={recalc} />
          </Field>
          <Field label="Próximo preventivo" htmlFor="nextDueOn" required hint="Se calcula solo; podés cambiarla." error={err.nextDueOn}>
            <Input
              ref={next}
              id="nextDueOn"
              name="nextDueOn"
              type="date"
              defaultValue={v.nextDueOn || addMonths(today, defaultInterval)}
              onChange={() => (nextTouched.current = true)}
            />
          </Field>
          <Field label="Informe en PDF" htmlFor="file" className="sm:col-span-2" hint="Opcional. Máximo 4 MB." error={err.file}>
            <input ref={file} id="file" name="file" type="file" accept="application/pdf,.pdf" className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-surface-2 file:px-4 file:font-semibold file:text-text" />
          </Field>
          <label className="flex min-h-11 items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="publicOnQr" defaultChecked={v.publicOnQr === "on"} className="mt-0.5 size-4 accent-accent-strong" />
            <span>
              El cliente puede ver el informe al escanear el QR
              <span className="block text-xs text-muted">Revisá antes que el PDF no tenga datos que no quieras mostrar.</span>
            </span>
          </label>
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Link href="/preventivos" className="inline-flex h-12 items-center px-4 text-sm font-semibold text-accent-strong">Cancelar</Link>
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar preventivo"}
        </Button>
      </div>
    </form>
  );
}
