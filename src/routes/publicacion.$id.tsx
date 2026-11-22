import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBox, Loading, PhotoGrid, Stars } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { categoryLabel } from "@/lib/constants";
import { fmtXLM, quote, rangesOverlap } from "@/lib/pricing";

export const Route = createFileRoute("/publicacion/$id")({
  head: () => ({
    meta: [
      { title: "Publicación — Muuvaca" },
      { name: "description", content: "Detalle, disponibilidad y reserva con depósito de garantía." },
      { property: "og:title", content: "Publicación en Muuvaca" },
      { property: "og:description", content: "Reserva por fechas con garantía en Stellar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*, owner:profiles!listings_owner_id_fkey(id, display_name, location)").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("not found");
      const [{ data: ranges }, { data: stats }] = await Promise.all([
        supabase.rpc("listing_booked_ranges", { _listing: id }),
        supabase.rpc("user_stats", { _user: data.owner_id }),
      ]);
      return { l: data, ranges: ranges ?? [], stats: stats?.[0] };
    },
  });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message="Esta publicación no existe o ya no está disponible." /></div>;
  const { l, ranges, stats } = q.data;
  const minStart = l.available_from > today ? l.available_from : today;
  const valid = start && end && end >= start && start >= minStart && end <= l.available_to;
  const conflict = valid && ranges.some((r) => rangesOverlap(start, end, r.start_date, r.end_date));
  const qt = valid ? quote(Number(l.price_per_day), Number(l.deposit), start, end) : null;
  const isOwner = user?.id === l.owner_id;

  async function reserve() {
    if (!user) { navigate({ to: "/auth", search: { redirect: `/publicacion/${id}` } }); return; }
    if (!valid || conflict) return;
    setSaving(true);
    const { data, error } = await supabase.from("bookings").insert({ listing_id: l.id, renter_id: user.id, owner_id: l.owner_id, start_date: start, end_date: end }).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitud enviada al dueño");
    navigate({ to: "/reservas/$id", params: { id: data.id } });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-earth">{categoryLabel(l.category)}</p>
          <h1 className="text-3xl font-bold md:text-4xl">{l.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {l.location_text || "Ubicación no indicada"}</p>
        </div>
        <PhotoGrid paths={l.photos} />
        <p className="whitespace-pre-line">{l.description || "Sin descripción."}</p>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5" /> Disponibilidad</h2>
          <p className="mt-1 text-sm">Del {l.available_from} al {l.available_to}</p>
          {ranges.length > 0 && (
            <ul className="mt-2 text-sm text-muted-foreground">
              {ranges.map((r, i) => <li key={i}>Ocupado: {r.start_date} → {r.end_date}</li>)}
            </ul>
          )}
        </div>
        {l.owner && (
          <Link to="/perfil/$id" params={{ id: l.owner.id }} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:bg-muted">
            <div>
              <p className="text-sm text-muted-foreground">Dueño</p>
              <p className="font-semibold">{l.owner.display_name}</p>
            </div>
            <div className="text-right text-sm">
              {stats?.review_count ? <><Stars value={Number(stats.avg_rating)} /> <p>{stats.avg_rating} · {stats.review_count} reseñas</p></> : <p className="text-muted-foreground">Sin reseñas aún</p>}
              <p className="text-muted-foreground">{stats?.completed ?? 0} alquileres cerrados</p>
            </div>
          </Link>
        )}
      </div>
      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-20">
        <p className="text-2xl font-bold">{fmtXLM(Number(l.price_per_day))} <span className="text-base font-normal text-muted-foreground">/ día</span></p>
        <p className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Depósito de garantía: <b>{fmtXLM(Number(l.deposit))}</b></p>
        {isOwner ? (
          <p className="rounded-lg bg-muted p-3 text-sm">Esta es tu publicación.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="s">Desde</Label><Input id="s" type="date" min={minStart} max={l.available_to} value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label htmlFor="e">Hasta</Label><Input id="e" type="date" min={start || minStart} max={l.available_to} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            {conflict && <ErrorBox message="Esas fechas se cruzan con otra reserva." />}
            {start && end && !valid && <ErrorBox message="Elige fechas dentro de la disponibilidad." />}
            {qt && !conflict && (
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt>{qt.days} días × {fmtXLM(Number(l.price_per_day))}</dt><dd>{fmtXLM(qt.rental)}</dd></div>
                <div className="flex justify-between"><dt>Depósito (se devuelve)</dt><dd>{fmtXLM(qt.deposit)}</dd></div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total a pagar</dt><dd>{fmtXLM(qt.total)}</dd></div>
              </dl>
            )}
            <Button className="w-full" size="lg" disabled={saving || (!!user && (!valid || !!conflict))} onClick={reserve}>
              {saving ? "Enviando…" : user ? "Solicitar reserva" : "Ingresa para reservar"}
            </Button>
            <p className="text-xs text-muted-foreground">Pagarás después de que el dueño acepte.</p>
          </>
        )}
      </aside>
    </div>
  );
}
