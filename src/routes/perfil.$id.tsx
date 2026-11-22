import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorBox, Loading, Stars } from "@/components/common";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/perfil/$id")({
  head: () => ({
    meta: [
      { title: "Perfil de productor — Muuvaca" },
      { name: "description", content: "Historial verificable: alquileres cerrados, calificaciones y reseñas." },
      { property: "og:title", content: "Perfil en Muuvaca" },
      { property: "og:description", content: "Reputación verificable de un productor." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const [p, s, r, l] = await Promise.all([
        supabase.from("profiles").select("id, display_name, location, stellar_address, created_at").eq("id", id).maybeSingle(),
        supabase.rpc("user_stats", { _user: id }),
        supabase.from("reviews").select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(display_name)").eq("reviewee_id", id).order("created_at", { ascending: false }),
        supabase.from("listings").select("*").eq("owner_id", id).eq("active", true),
      ]);
      if (p.error || !p.data) throw new Error("not found");
      return { p: p.data, s: s.data?.[0], reviews: r.data ?? [], listings: l.data ?? [] };
    },
  });
  if (q.isLoading) return <Loading />;
  if (!q.data) return <div className="mx-auto max-w-3xl p-6"><ErrorBox message="Perfil no encontrado." /></div>;
  const { p, s, reviews, listings } = q.data;
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="rounded-3xl border border-border bg-card p-8">
        <h1 className="text-3xl font-bold">{p.display_name}</h1>
        <p className="text-muted-foreground">{p.location || "Ubicación no indicada"} · Miembro desde {new Date(p.created_at).toLocaleDateString("es")}</p>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-muted p-4"><p className="text-2xl font-bold">{s?.completed ?? 0}</p><p className="text-xs text-muted-foreground">Alquileres cerrados</p></div>
          <div className="rounded-xl bg-muted p-4"><p className="text-2xl font-bold">{s?.avg_rating ?? "—"}</p><p className="text-xs text-muted-foreground">Calificación</p></div>
          <div className="rounded-xl bg-muted p-4"><p className="text-2xl font-bold">{s?.review_count ?? 0}</p><p className="text-xs text-muted-foreground">Reseñas</p></div>
        </div>
        {p.stellar_address && <p className="mt-4 break-all text-xs text-muted-foreground">Cuenta Stellar: <a className="underline" target="_blank" rel="noreferrer" href={`https://stellar.expert/explorer/testnet/account/${p.stellar_address}`}>{p.stellar_address}</a></p>}
      </div>
      <section>
        <h2 className="mb-4 text-2xl font-bold">Reseñas</h2>
        {reviews.length === 0 ? <EmptyState title="Sin reseñas todavía" /> : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es")}</span></div>
                {r.comment && <p className="mt-2">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">— {r.reviewer?.display_name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {listings.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Publicaciones</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        </section>
      )}
    </div>
  );
}
