"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { uploadPhotoAction, type FormState } from "../actions";

const MAX_SIDE = 1280;
const MAX_UPLOAD = 1_500_000;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Decodifica la imagen. Primero createImageBitmap (rápido); si el navegador no puede, un <img> común. */
async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { src: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

/** Achica la foto (lado mayor 1280 px, JPEG ~200-400 KB). Si no se puede, manda la original si ya es chica. */
async function prepare(file: File): Promise<File> {
  try {
    const { src, w, h, done } = await decode(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("sin canvas");
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    done();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    canvas.width = canvas.height = 0; // libera memoria en celulares
    if (!blob) throw new Error("sin blob");
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    if (OK_TYPES.includes(file.type) && file.size <= MAX_UPLOAD) return file;
    throw new Error(
      /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
        ? "Este navegador no puede abrir fotos HEIC. Sacá la foto de nuevo desde la app o elegí una en JPG."
        : "No pudimos leer esa imagen. Probá sacando la foto de nuevo.",
    );
  }
}

export function PhotoUploader({ equipmentId, hasPhoto }: { equipmentId: string; hasPhoto: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(uploadPhotoAction.bind(null, equipmentId), {});
  const [sending, start] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLocalError(undefined);
    setProcessing(true);
    try {
      const ready = await prepare(f);
      const fd = new FormData();
      fd.set("photo", ready);
      start(() => action(fd));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No pudimos leer esa imagen.");
    } finally {
      setProcessing(false);
    }
  }

  const busy = processing || sending;
  const error = localError ?? state.errors?.photo;
  return (
    <div>
      {/* Sin "capture": el celular ofrece cámara o galería. Abrir la cámara directo hace que algunos Android cierren la página. */}
      <input ref={input} type="file" accept="image/*" className="sr-only" id="photo-input" onChange={onPick} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-strong disabled:opacity-60"
      >
        <Camera aria-hidden className="size-4" />
        {processing ? "Preparando la foto…" : sending ? "Subiendo…" : hasPhoto ? "Cambiar foto" : "Agregar foto"}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {state.message && !error && !busy && <p role="status" className="text-sm text-success">{state.message}</p>}
    </div>
  );
}
