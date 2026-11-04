import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getEquipment } from "@/lib/data";
import { qrSvg } from "@/lib/qr";
import { ArFlag, ButtonLink } from "@/components/ui";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Etiqueta" };

export default async function LabelPage({ params }: PageProps<"/equipos/[id]/etiqueta">) {
  const staff = await requireStaff();
  const { id } = await params;
  const e = await getEquipment(staff.id, id);
  if (!e) notFound();
  const svg = await qrSvg(e.qr_token);

  return (
    <>
      {/* 50 × 30 mm, para impresora de etiquetas. En A4 sale arriba a la izquierda. */}
      <style>{`@page { size: 50mm 30mm; margin: 0 } @media print { main#contenido { padding: 0 !important } }`}</style>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Etiqueta</p>
          <h1 className="text-2xl font-bold">{e.code}</h1>
          <p className="text-sm text-muted">50 × 30 mm. Si imprimís en hoja común, recortá por la línea punteada.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/equipos/${e.id}`} variant="secondary">Volver</ButtonLink>
          <PrintButton />
        </div>
      </div>

      <div
        className="flex h-[30mm] w-[50mm] items-center gap-[2mm] overflow-hidden bg-white p-[1.5mm] text-black outline-1 outline-dashed outline-border-input print:outline-0"
        aria-label={`Etiqueta del equipo ${e.code}`}
      >
        <div
          className="h-[27mm] w-[27mm] flex-none [&_svg]:h-full [&_svg]:w-full"
          role="img"
          aria-label="Código QR"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex min-w-0 flex-col leading-none">
          <span className="text-[11pt] font-bold">NYB</span>
          <span className="text-[4.5pt] font-semibold tracking-[0.3em] text-[#2a7a7c]">MEDICAL</span>
          <span className="mono mt-[1.5mm] text-[7.5pt] font-semibold">{e.code}</span>
          <span className="mt-[1mm] line-clamp-2 text-[5pt] leading-[6pt]">{e.equipment_type}</span>
          <span className="mt-[1.2mm] flex items-center gap-[1mm] text-[5pt]">
            <ArFlag className="h-[2.2mm] w-[3.3mm]" /> 11 6299 3838
          </span>
        </div>
      </div>
    </>
  );
}
