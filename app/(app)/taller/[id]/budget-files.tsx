"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import type { BudgetFile } from "@/lib/data";
import { fmtBytes, fmtDate } from "@/lib/format";
import { removeBudgetAction, uploadBudgetAction } from "../actions";
import type { FormState } from "../../equipos/actions";

const MAX_PDF = 4_000_000;

export function BudgetFiles({ orderId, files }: { orderId: string; files: BudgetFile[] }) {
  const [upState, upload] = useActionState<FormState, FormData>(uploadBudgetAction.bind(null, orderId), {});
  const [rmState, remove] = useActionState<FormState, FormData>(removeBudgetAction.bind(null, orderId), {});
  const [busy, start] = useTransition();
  const [localError, setLocalError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLocalError(undefined);
    if (f.size > MAX_PDF) return setLocalError("El PDF es muy pesado (máximo 4 MB).");
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return setLocalError("El archivo tiene que ser un PDF.");
    const fd = new FormData();
    fd.set("file", f);
    start(() => upload(fd));
  }

  function onRemove(f: BudgetFile) {
    if (!window.confirm(`¿Quitar "${f.filename}"? El archivo se borra y queda anotado en la hoja de vida.`)) return;
    const fd = new FormData();
    fd.set("fileId", f.id);
    start(() => remove(fd));
  }

  const error = localError ?? upState.errors?.file ?? rmState.errors?.file;
  const message = upState.stamp && rmState.stamp ? (upState.stamp > rmState.stamp ? upState.message : rmState.message) : upState.message ?? rmState.message;
  return (
    <div>
      {files.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay presupuestos cargados en esta orden.</p>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-1">
              <a
                href={`/taller/${orderId}/presupuesto/${f.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
              >
                <FileText aria-hidden className="size-4 flex-none text-accent-strong" />
                <span className="min-w-0">
                  <span className="block font-semibold break-words text-accent-strong">{f.filename}</span>
                  <span className="block text-xs text-muted">
                    {fmtDate(f.created_at)} · {fmtBytes(f.size_bytes)}
                    {f.uploaded_by_name && <> · {f.uploaded_by_name}</>}
                  </span>
                </span>
              </a>
              <button
                type="button"
                onClick={() => onRemove(f)}
                disabled={busy}
                aria-label={`Quitar ${f.filename}`}
                className="inline-flex size-11 flex-none items-center justify-center text-muted hover:text-danger disabled:opacity-60"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} id="budget-input" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onPick} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-busy={busy}
        className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-strong disabled:opacity-60"
      >
        <Upload aria-hidden className="size-4" />
        {busy ? "Guardando…" : "Subir presupuesto en PDF"}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && !error && !busy && <p role="status" className="text-sm text-success">{message}</p>}
    </div>
  );
}
