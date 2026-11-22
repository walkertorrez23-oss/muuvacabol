import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fmtXLM } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta — Muuvaca" },
      { name: "description", content: "Tus datos, cuenta Stellar y publicaciones." },
      { property: "og:title", content: "Mi cuenta — Muuvaca" },
      { property: "og:description", content: "Gestiona tu perfil de productor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cuenta,
});

function Cuenta() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["me", user.id],
    queryFn: async () => {
      const [p, l, pr] = await Promise.all([
        supabase.from("profiles").select("id, display_name, location, stellar_address").eq("id", user.id).single(),
        supabase.from("listings").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profile_private").select("phone").eq("user_id", user.id).maybeSingle(),
      ]);
      if (p.error) throw p.error;
      return { p: p.data, phone: pr.data?.phone ?? "", listings: l.data ?? [] };
    },
  });
  const [f, setF] = useState({ display_name: "", location: "", phone: "", stellar_address: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) setF({ display_name: q.data.p.display_name, location: q.data.p.location ?? "", phone: q.data.phone, stellar_address: q.data.p.stellar_address ?? "" }); }, [q.data]);
  if (q.isLoading || !q.data) return <Loading />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.stellar_address && !/^G[A-Z2-7]{55}$/.test(f.stellar_address.trim())) { toast.error("La dirección Stellar debe empezar con G y tener 56 caracteres"); return; }
    setBusy(true);
    const { error: e1 } = await supabase.from("profiles").update({ display_name: f.display_name, location: f.location, stellar_address: f.stellar_address.trim() || null }).eq("id", user.id);
    const { error: e2 } = await supabase.from("profile_private").upsert({ user_id: user.id, phone: f.phone.trim() || null, updated_at: new Date().toISOString() });
    const error = e1 ?? e2;
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Datos guardados");
    qc.invalidateQueries({ queryKey: ["me", user.id] });
  }
  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("listings").update({ active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(active ? "Publicación activa" : "Publicación pausada");
    qc.invalidateQueries({ queryKey: ["me", user.id] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mi cuenta</h1>
        <Link to="/perfil/$id" params={{ id: user.id }} className="text-sm text-primary underline">Ver mi perfil público</Link>
      </div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div><Label htmlFor="dn">Nombre o establecimiento</Label><Input id="dn" required value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="lo">Localidad</Label><Input id="lo" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
          <div><Label htmlFor="ph">Teléfono (solo lo ve quien tenga una reserva aceptada contigo)</Label><Input id="ph" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="sa">Dirección Stellar pública (opcional)</Label><Input id="sa" placeholder="G…" value={f.stellar_address} onChange={(e) => setF({ ...f, stellar_address: e.target.value })} /></div>
        <Button disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
      </form>
      <section>
        <h2 className="mb-3 text-2xl font-bold">Mis publicaciones</h2>
        {q.data.listings.length === 0 ? <p className="text-muted-foreground">No tienes publicaciones. <Link to="/publicar" className="text-primary underline">Publicar</Link></p> : (
          <ul className="space-y-2">
            {q.data.listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <Link to="/publicacion/$id" params={{ id: l.id }} className="font-semibold hover:text-primary">{l.title} <span className="text-sm font-normal text-muted-foreground">· {fmtXLM(Number(l.price_per_day))}/día</span></Link>
                <Switch checked={l.active} onCheckedChange={(v) => toggle(l.id, v)} aria-label="Activa" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
