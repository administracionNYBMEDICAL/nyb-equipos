"use server";

import { redirect } from "next/navigation";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Completá el email y la contraseña.", email };
  if (!supabaseConfigured()) redirect(safeNext(form.get("next")));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "El email o la contraseña no coinciden.", email };
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
