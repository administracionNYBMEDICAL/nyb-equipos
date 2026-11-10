import { getStaff } from "@/lib/auth";
import { getReportFile } from "@/lib/data";

// Informe de preventivo en PDF, para el personal de NYB.
export async function GET(_req: Request, ctx: RouteContext<"/preventivos/informe/[id]">) {
  const staff = await getStaff();
  if (!staff) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  const file = await getReportFile(staff.id, id);
  if (!file) return new Response("No encontrado", { status: 404 });
  const ascii = file.filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
