import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorBox, Loading, StatusBadge } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtXLM } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/reservas/")({
  head: () => ({
    meta: [
      { title: "Mis reservas — Muuvaca" },
      { name: "description", content: "Tus reservas como arrendatario y como dueño." },
      { property: "og:title", content: "Mis reservas — Muuvaca" },
      { property: "og:description", content: "Seguimiento de reservas, pagos y actas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reservas,
});

function Reservas() {
  const { user } = Route.useRouteContext();
  const q = useQuery({
    queryKey: ["bookings", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*, listing:listings(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <div className="mx-auto max-w-3xl p-6"><ErrorBox message="No se pudieron cargar tus reservas." /></div>;
  const mine = (q.data ?? []).filter((b) => b.renter_id === user.id);
  const owned = (q.data ?? []).filter((b) => b.owner_id === user.id);
  const List = ({ items, empty }: { items: typeof mine; empty: string }) =>
    items.length === 0 ? <EmptyState title={empty} /> : (
      <ul className="space-y-3">
        {items.map((b) => (
          <li key={b.id}>
            <Link to="/reservas/$id" params={{ id: b.id }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted">
              <div>
                <p className="font-semibold">{b.listing?.title}</p>
                <p className="text-sm text-muted-foreground">{b.start_date} → {b.end_date} · {fmtXLM(Number(b.total_amount))}</p>
              </div>
              <StatusBadge status={b.status} />
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Mis reservas</h1>
      <Tabs defaultValue={mine.length || !owned.length ? "renter" : "owner"} className="mt-6">
        <TabsList><TabsTrigger value="renter">Alquilo ({mine.length})</TabsTrigger><TabsTrigger value="owner">Me alquilan ({owned.length})</TabsTrigger></TabsList>
        <TabsContent value="renter" className="mt-4"><List items={mine} empty="Todavía no reservaste nada" /></TabsContent>
        <TabsContent value="owner" className="mt-4"><List items={owned} empty="Aún no recibiste solicitudes" /></TabsContent>
      </Tabs>
    </div>
  );
}
