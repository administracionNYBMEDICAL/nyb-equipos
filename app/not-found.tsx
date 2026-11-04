import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <Link href="/" className="font-semibold text-accent-strong underline">Volver al panel</Link>
    </main>
  );
}
