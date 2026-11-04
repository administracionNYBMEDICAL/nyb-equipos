import { getStaff } from "@/lib/auth";
import { getPhoto } from "@/lib/data";

// Foto del equipo: solo para el personal de NYB.
export async function GET(_req: Request, ctx: RouteContext<"/equipos/[id]/foto">) {
  const staff = await getStaff();
  if (!staff) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  const photo = await getPhoto(staff.id, id);
  if (!photo) return new Response("Sin foto", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=31536000, immutable", // la URL lleva ?v=<versión>
      "X-Content-Type-Options": "nosniff",
    },
  });
}
