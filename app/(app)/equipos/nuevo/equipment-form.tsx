"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createEquipmentAction, type FormState } from "../actions";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";

export function EquipmentForm({ clients, sites, types }: { clients: string[]; sites: string[]; types: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createEquipmentAction, {});
  const v = state.values ?? {};
  const err = state.errors ?? {};
  const a11y = (name: string) => ({
    "aria-invalid": err[name] ? true : undefined,
    "aria-describedby": err[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message && (
        <Alert>
          {state.message}{" "}
          {state.duplicate && (
            <Link href={`/equipos/${state.duplicate.id}`} className="underline">
              Abrir {state.duplicate.code}
            </Link>
          )}
        </Alert>
      )}

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">El equipo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de equipo" htmlFor="equipmentType" required error={err.equipmentType} className="sm:col-span-2">
            <Input id="equipmentType" name="equipmentType" list="types" defaultValue={v.equipmentType} required {...a11y("equipmentType")} />
            <datalist id="types">{types.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Marca" htmlFor="brand" error={err.brand}>
            <Input id="brand" name="brand" defaultValue={v.brand} {...a11y("brand")} />
          </Field>
          <Field label="Modelo" htmlFor="model" error={err.model}>
            <Input id="model" name="model" defaultValue={v.model} {...a11y("model")} />
          </Field>
          <Field label="Número de serie" htmlFor="serial" hint="Dejalo vacío si el equipo no tiene número." error={err.serial}>
            <Input id="serial" name="serial" className="mono" autoCapitalize="characters" defaultValue={v.serial} {...a11y("serial")} />
          </Field>
          <Field label="Nº de patrimonio del hospital" htmlFor="assetNumber" error={err.assetNumber}>
            <Input id="assetNumber" name="assetNumber" defaultValue={v.assetNumber} {...a11y("assetNumber")} />
          </Field>
          <Field label="Código UMDNS" htmlFor="umdnsCode" hint="Opcional" error={err.umdnsCode}>
            <Input id="umdnsCode" name="umdnsCode" inputMode="numeric" defaultValue={v.umdnsCode} {...a11y("umdnsCode")} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-semibold">De quién es y dónde está</h2>
        <p className="mb-4 text-sm text-muted">Si el cliente o el hospital no existen, se crean solos.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente (quién lo manda)" htmlFor="clientName" required error={err.clientName} className="sm:col-span-2">
            <Input id="clientName" name="clientName" list="clients" defaultValue={v.clientName} required {...a11y("clientName")} />
            <datalist id="clients">{clients.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Hospital o sanatorio" htmlFor="siteName" hint="Si es el mismo cliente, podés dejarlo vacío." error={err.siteName}>
            <Input id="siteName" name="siteName" list="sites" defaultValue={v.siteName} {...a11y("siteName")} />
            <datalist id="sites">{sites.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Sector" htmlFor="sector" hint="Neo, Pediatría, UTI, Quirófano…" error={err.sector}>
            <Input id="sector" name="sector" list="sectors" defaultValue={v.sector} {...a11y("sector")} />
            <datalist id="sectors">
              {["Neonatología", "Pediatría", "UTI", "Quirófano", "Cirugía", "Guardia", "Ambulancias"].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Notas internas" htmlFor="notes" error={err.notes} className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={2} defaultValue={v.notes} {...a11y("notes")} />
          </Field>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="ingresar" defaultChecked className="size-5 accent-[var(--color-accent-strong)]" />
          Registrar el ingreso al taller a continuación
        </label>
        <div className="flex gap-2">
          <Link href="/equipos" className="inline-flex h-12 items-center px-4 text-sm font-semibold text-accent-strong">
            Cancelar
          </Link>
          <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
            {pending ? "Guardando…" : "Guardar equipo"}
          </Button>
        </div>
      </div>
    </form>
  );
}
