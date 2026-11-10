"use client";

import { useActionState, useState, useTransition } from "react";
import { Eye, EyeOff, FileText } from "lucide-react";
import type { EquipmentMaintenance } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { rescheduleAction, toggleReportPublicAction } from "../../preventivos/actions";
import type { FormState } from "../actions";
import { Button, ButtonLink, Field, Input, StatusBadge, cx } from "@/components/ui";

export function MaintenancePanel({ equipmentId, data, canRegister }: { equipmentId: string; data: EquipmentMaintenance; canRegister: boolean }) {
  const [state, reschedule, pending] = useActionState<FormState, FormData>(rescheduleAction.bind(null, equipmentId), {});
  const [toggleMsg, setToggleMsg] = useState<string>();
  const [toggling, start] = useTransition();
  const v = state.values ?? {};
  const err = state.errors ?? {};
  const { plan, runs } = data;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Próximo preventivo</p>
          {plan ? (
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {fmtDate(plan.next_due_on)} <StatusBadge group="maintenance" value={plan.due_state} />
            </p>
          ) : (
            <p className="text-lg font-semibold">Sin programar</p>
          )}
          {plan && (
            <p className="text-xs text-muted">Cada {plan.interval_months} {plan.interval_months === 1 ? "mes" : "meses"}</p>
          )}
        </div>
        {canRegister && <ButtonLink href={`/preventivos/nuevo?equipo=${equipmentId}`}>+ Registrar preventivo</ButtonLink>}
      </div>

      {plan && (
        <details className="rounded-md border border-border">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-accent-strong">Cambiar la próxima fecha</summary>
          <form key={state.stamp} action={reschedule} className="grid gap-3 px-4 pb-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
            <Field label="Periodicidad (meses)" htmlFor="r-interval" error={err.intervalMonths}>
              <Input id="r-interval" name="intervalMonths" type="number" min={1} max={60} inputMode="numeric" defaultValue={v.intervalMonths || String(plan.interval_months)} />
            </Field>
            <Field label="Próximo preventivo" htmlFor="r-next" error={err.nextDueOn}>
              <Input id="r-next" name="nextDueOn" type="date" defaultValue={v.nextDueOn || plan.next_due_on} />
            </Field>
            <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
              {pending ? "Guardando…" : "Guardar fecha"}
            </Button>
          </form>
        </details>
      )}
      {state.message && (
        <p role="status" className={cx("text-sm", state.errors ? "text-danger" : "text-success")}>{state.message}</p>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold">Preventivos realizados</h3>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay preventivos registrados para este equipo.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="text-sm font-semibold">{fmtDate(r.executed_on)}</span>
                <span className={cx("text-xs font-semibold", r.passed ? "text-success" : "text-danger")}>{r.passed ? "Apto" : "NO apto"}</span>
                {r.report_number && <span className="mono text-sm text-muted">Informe {r.report_number}</span>}
                <span className="w-full text-xs text-muted sm:w-auto sm:min-w-0 sm:flex-1">{r.executed_by_name && <>Cargado por {r.executed_by_name}</>}</span>
                {r.file_id ? (
                  <span className="flex flex-wrap items-center gap-1">
                    <a
                      href={`/preventivos/informe/${r.file_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-accent-strong hover:underline"
                    >
                      <FileText aria-hidden className="size-4" /> Informe PDF
                    </a>
                    <button
                      type="button"
                      disabled={toggling}
                      onClick={() =>
                        start(async () => {
                          const res = await toggleReportPublicAction(r.file_id!, !r.file_public);
                          setToggleMsg(res.message);
                        })
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted hover:text-text disabled:opacity-60"
                    >
                      {r.file_public ? <Eye aria-hidden className="size-4 text-accent-strong" /> : <EyeOff aria-hidden className="size-4" />}
                      {r.file_public ? "Visible en el QR · ocultar" : "Oculto en el QR · mostrar"}
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-muted">Sin informe PDF</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {toggleMsg && !toggling && <p role="status" className="mt-1 text-sm text-success">{toggleMsg}</p>}
      </div>
    </div>
  );
}
