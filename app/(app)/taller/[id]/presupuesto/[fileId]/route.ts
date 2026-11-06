import { getStaff } from "@/lib/auth";
import { getBudgetFile } from "@/lib/data";

// PDF del presupuesto: solo para el personal de NYB. Nunca se expone en la ficha pública.
export async function GET(_req: Request, ctx: RouteContext<"/taller/[id]/presupuesto/[fileId]">) {
  const staff = await getStaff();
  if (!staff) return new Response("No autorizado", { status: 401 });
  const { id, fileId } = await ctx.params;
  const file = await getBudgetFile(staff.id, id, fileId);
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
