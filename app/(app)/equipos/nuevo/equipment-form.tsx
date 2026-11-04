"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ChevronDown } from "lucide-react";
import { createEquipmentAction, type FormState } from "../actions";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const MORE_FIELDS = ["umdnsCode", "condition", "classification", "manufacturedOn", "purchasedOn", "warrantyUntil"];

export function EquipmentForm({
  clients,
  sites,
  types,
  initial = {},
  action = createEquipmentAction,
  mode = "create",
  cancelHref = "/equipos",
}: {
  clients: string[];
  sites: string[];
  types: string[];
  initial?: Record<string, string>;
  action?: Action;
  mode?: "create" | "edit";
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  // key: con cada respuesta del servidor el formulario se arma con los valores devueltos
  return (
    <Inner
      key={state.stamp ?? 0}
      {...{ state, formAction, pending, clients, sites, types, mode, cancelHref }}
      v={{ ...initial, ...(state.values ?? {}) }}
    />
  );
}

function Inner({
  state,
  formAction,
  pending,
  clients,
  sites,
  types,
  mode,
  cancelHref,
  v,
}: {
  state: FormState;
  formAction: (f: FormData) => void;
  pending: boolean;
  clients: string[];
  sites: string[];
  types: string[];
  mode: "create" | "edit";
  cancelHref: string;
  v: Record<string, string>;
}) {
  const err = state.errors ?? {};
  const a11y = (name: string) => ({
    "aria-invalid": err[name] ? true : undefined,
    "aria-describedby": err[name] ? `${name}-error` : undefined,
  });
  const moreOpen = MORE_FIELDS.some((k) => v[k] || err[k]);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
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
        </div>

        <details open={moreOpen} className="group mt-5 rounded-md border border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-accent-strong">
            Más datos (opcional)
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-3">
            <Field label="Condición" htmlFor="condition" error={err.condition}>
              <Select id="condition" name="condition" defaultValue={v.condition ?? ""}>
                <option value="">Sin indicar</option>
                <option value="propio">Propio del hospital</option>
                <option value="comodato">En comodato</option>
                <option value="alquiler">Alquilado</option>
              </Select>
            </Field>
            <Field label="Clase de riesgo" htmlFor="classification" error={err.classification}>
              <Select id="classification" name="classification" defaultValue={v.classification ?? ""}>
                <option value="">Sin indicar</option>
                {["Clase I", "Clase II", "Clase III", "Clase IV"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Código UMDNS" htmlFor="umdnsCode" error={err.umdnsCode}>
              <Input id="umdnsCode" name="umdnsCode" inputMode="numeric" defaultValue={v.umdnsCode} {...a11y("umdnsCode")} />
            </Field>
            <Field label="Fecha de fabricación" htmlFor="manufacturedOn" error={err.manufacturedOn}>
              <Input id="manufacturedOn" name="manufacturedOn" type="date" defaultValue={v.manufacturedOn} {...a11y("manufacturedOn")} />
            </Field>
            <Field label="Fecha de compra" htmlFor="purchasedOn" error={err.purchasedOn}>
              <Input id="purchasedOn" name="purchasedOn" type="date" defaultValue={v.purchasedOn} {...a11y("purchasedOn")} />
            </Field>
            <Field label="Garantía hasta" htmlFor="warrantyUntil" error={err.warrantyUntil}>
              <Input id="warrantyUntil" name="warrantyUntil" type="date" defaultValue={v.warrantyUntil} {...a11y("warrantyUntil")} />
            </Field>
          </div>
        </details>
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
        {mode === "create" ? (
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="ingresar" defaultChecked className="size-5 accent-[var(--color-accent-strong)]" />
            Registrar el ingreso al taller a continuación
          </label>
        ) : (
          <p className="text-sm text-muted">Los cambios quedan anotados en la hoja de vida, con tu nombre.</p>
        )}
        <div className="flex gap-2">
          <Link href={cancelHref} className="inline-flex h-12 items-center px-4 text-sm font-semibold text-accent-strong">
            Cancelar
          </Link>
          <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
            {pending ? "Guardando…" : mode === "create" ? "Guardar equipo" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
