import { Card, PageHeader } from "@/components/ui";

export function ComingSoon({ eyebrow, title, items }: { eyebrow: string; title: string; items: string[] }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <Card className="p-5">
        <p className="font-semibold">Esta sección llega en la próxima etapa.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
