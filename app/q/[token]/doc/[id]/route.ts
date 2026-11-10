import { getPublicDocument } from "@/lib/data";

// Documento que NYB marcó como visible para el cliente (por ahora, informes de preventivo).
// Público: lo abre quien escanea el QR. El nombre del archivo original no se expone.
export async function GET(_req: Request, ctx: RouteContext<"/q/[token]/doc/[id]">) {
  const { token, id } = await ctx.params;
  const doc = await getPublicDocument(token, id);
  if (!doc) return new Response("Documento no disponible", { status: 404 });
  const name = doc.kind === "informe_preventivo" && doc.executed_on ? `informe-preventivo-${doc.executed_on}.pdf` : "documento.pdf";
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
