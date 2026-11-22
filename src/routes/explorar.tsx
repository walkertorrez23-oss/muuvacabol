import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState, ErrorBox, Loading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/constants";
import { distanceKm } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorar")({
  head: () => ({
    meta: [
      { title: "Explorar — Muuvaca" },
      { name: "description", content: "Encuentra maquinaria, herramientas y ganado disponibles cerca de ti." },
      { property: "og:title", content: "Explorar publicaciones — Muuvaca" },
      { property: "og:description", content: "Maquinaria, herramientas y ganado para alquilar entre productores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explorar,
});

function Explorar() {
  const [cat, setCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("active", true).gte("available_to", new Date().toISOString().slice(0, 10)).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = useMemo(() => {
    let r = (data ?? []).map((l) => ({ l, d: pos && l.lat != null && l.lng != null ? distanceKm(pos, { lat: l.lat, lng: l.lng }) : null }));
    if (cat) r = r.filter((x) => x.l.category === cat);
    if (q) r = r.filter((x) => (x.l.title + " " + x.l.location_text).toLowerCase().includes(q.toLowerCase()));
    if (maxPrice) r = r.filter((x) => Number(x.l.price_per_day) <= Number(maxPrice));
    if (pos) r.sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
    return r;
  }, [data, cat, q, maxPrice, pos]);

  function locate() {
    if (!navigator.geolocation) { toast.error("Tu navegador no permite ubicación."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); toast.success("Ordenado por cercanía"); },
      () => { setLocating(false); toast.error("No se pudo obtener tu ubicación."); },
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold md:text-4xl">Explorar</h1>
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <Input placeholder="Buscar por nombre o lugar" value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-xs" />
        <Input type="number" min={0} placeholder="Precio máx./día (XLM)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="md:max-w-[200px]" />
        <Button variant="outline" onClick={locate} disabled={locating}><LocateFixed /> {locating ? "Ubicando…" : pos ? "Cerca de mí ✓" : "Cerca de mí"}</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[{ value: "", label: "Todo" }, ...CATEGORIES].map((c) => (
          <button key={c.value} onClick={() => setCat(c.value)} className={cn("rounded-full border px-4 py-1.5 text-sm", cat === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{c.label}</button>
        ))}
      </div>
      <div className="mt-8">
        {isLoading ? <Loading /> : error ? <ErrorBox message="No se pudieron cargar las publicaciones." /> : list.length === 0 ? (
          <EmptyState title={data?.length ? "Nada coincide con tu búsqueda" : "Aún no hay publicaciones"}>
            {data?.length ? "Prueba con otros filtros." : <>Sé el primero en publicar tu maquinaria, herramienta o ganado. <Link to="/publicar" className="font-semibold text-primary underline">Publicar</Link></>}
          </EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ l, d }) => <ListingCard key={l.id} l={l} distance={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}
