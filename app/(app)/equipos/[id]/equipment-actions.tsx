"use client";

import { useActionState, useState } from "react";
import { addNoteAction, changeStatusAction, type FormState } from "../actions";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { EQUIPMENT_STATUSES, statusLabel, type EquipmentStatus } from "@/lib/status";

export function NoteForm({ equipmentId }: { equipmentId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addNoteAction.bind(null, equipmentId), {});
  return (
    <form action={action} className="flex flex-col gap-3" key={state.message}>
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Field label="Agregar una novedad" htmlFor="note" error={state.errors?.note}>
        <Textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Ej.: se cambió la celda de O2; el cliente pidió presupuesto de batería"
          defaultValue={state.values?.note}
          aria-invalid={state.errors?.note ? true : undefined}
          aria-describedby={state.errors?.note ? "note-error" : undefined}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="visible" className="size-5 accent-[var(--color-accent-strong)]" />
          Que la vea el cliente al escanear el QR
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Guardando…" : "Agregar a la hoja de vida"}
        </Button>
      </div>
    </form>
  );
}

export function StatusForm({ equipmentId, current }: { equipmentId: string; current: EquipmentStatus }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeStatusAction.bind(null, equipmentId), {});
  const [value, setValue] = useState<string>(current);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.message && !state.errors && <Alert tone="success">{state.message}</Alert>}
      <Field label="Estado del equipo" htmlFor="status">
        <Select id="status" name="status" value={value} onChange={(e) => setValue(e.target.value)}>
          {EQUIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel("equipment", s)}</option>
          ))}
        </Select>
      </Field>
      {value !== current && (
        <Field
          label={value === "baja" ? "Motivo de la baja" : "Motivo (opcional)"}
          htmlFor="reason"
          required={value === "baja"}
          error={state.errors?.reason}
        >
          <Input id="reason" name="reason" aria-invalid={state.errors?.reason ? true : undefined} />
        </Field>
      )}
      <Button type="submit" variant={value === "baja" ? "danger" : "secondary"} disabled={pending || value === current}>
        {value === "baja" ? "Dar de baja" : "Cambiar estado"}
      </Button>
    </form>
  );
}
