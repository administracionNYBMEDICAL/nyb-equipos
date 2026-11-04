"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { uploadPhotoAction, type FormState } from "../actions";

/** Achica la foto en el navegador (lado mayor 1280 px, JPEG) antes de subirla: ~200-400 KB. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("No se pudo procesar"))), "image/jpeg", 0.82));
}

export function PhotoUploader({ equipmentId, hasPhoto }: { equipmentId: string; hasPhoto: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(uploadPhotoAction.bind(null, equipmentId), {});
  const [pending, start] = useTransition();
  const [localError, setLocalError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLocalError(undefined);
    try {
      const blob = await compress(f);
      const fd = new FormData();
      fd.set("photo", new File([blob], "foto.jpg", { type: "image/jpeg" }));
      start(() => action(fd));
    } catch {
      setLocalError("No pudimos leer esa imagen. Probá con otra foto.");
    }
  }

  const error = localError ?? state.errors?.photo;
  return (
    <div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" id="photo-input" onChange={onPick} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-strong disabled:opacity-50"
      >
        <Camera aria-hidden className="size-4" />
        {pending ? "Subiendo…" : hasPhoto ? "Cambiar foto" : "Agregar foto"}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {state.message && !error && <p role="status" className="text-xs text-success">{state.message}</p>}
    </div>
  );
}
