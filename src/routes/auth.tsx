import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({
    meta: [
      { title: "Ingresar — Muuvaca" },
      { name: "description", content: "Ingresa o crea tu cuenta de productor en Muuvaca." },
      { property: "og:title", content: "Ingresar a Muuvaca" },
      { property: "og:description", content: "Crea tu cuenta para publicar y reservar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/explorar");

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (user) navigate({ href: safe(redirect), replace: true }); }, [user, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name } } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message); return; }
      toast.success("¡Bienvenido!");
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("No se pudo ingresar con Google");
  }

  if (sent) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Revisa tu correo</h1>
      <p className="mt-3 text-muted-foreground">Enviamos un enlace de confirmación a <b>{email}</b>. Ábrelo para activar tu cuenta.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">{mode === "in" ? "Ingresar" : "Crear cuenta"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        {mode === "up" && <div><Label htmlFor="n">Nombre o establecimiento</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} /></div>}
        <div><Label htmlFor="em">Correo</Label><Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="pw">Contraseña</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={busy}>{busy ? "Procesando…" : mode === "in" ? "Ingresar" : "Crear cuenta"}</Button>
        <Button type="button" variant="outline" className="w-full" onClick={google}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continuar con Google
        </Button>
      </form>
      <button className="mt-4 text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Ingresar"}
      </button>
    </div>
  );
}
