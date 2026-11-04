import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Alert, EcgLine } from "@/components/ui";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const noAccess = sp.error === "sin-acceso";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/nyb-sticker.png" alt="NYB Medical" width={112} height={112} priority className="size-28" />
          <EcgLine className="mt-4 h-6" />
          <h1 className="mt-2 text-xl font-semibold text-on-brand">Equipos y taller</h1>
          <p className="text-sm text-brand-muted">Acceso para el equipo de NYB Medical</p>
        </div>
        <div className="rounded-lg bg-bg p-6 shadow-pop">
          {noAccess && (
            <div className="mb-4">
              <Alert>Tu usuario no tiene acceso. Pedile a un administrador que te dé de alta.</Alert>
            </div>
          )}
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
