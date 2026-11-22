import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/constants";
import { uploadPhotos } from "@/lib/photos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/publicar")({
  head: () => ({
    meta: [
      { title: "Publicar — Muuvaca" },
      { name: "description", content: "Publica tu maquinaria, herramienta o ganado para alquilar." },
      { property: "og:title", content: "Publicar en Muuvaca" },
      { property: "og:description", content: "Gana con lo que no estás usando." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Publicar,
});

function Publicar() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ title: "", description: "", category: "maquinaria", price: "", deposit: "", location: "", from: today, to: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Ubicación guardada"); },
      () => toast.error("No se pudo obtener la ubicación"),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) { toast.error("Agrega al menos una foto"); return; }
    if (!f.to || f.to < f.from) { toast.error("Revisa las fechas disponibles"); return; }
    setBusy(true);
    try {
      const photos = await uploadPhotos(user.id, files, "listings");
      const { data, error } = await supabase.from("listings").insert({
        owner_id: user.id, title: f.title.trim(), description: f.description.trim(), category: f.category,
        price_per_day: Number(f.price), deposit: Number(f.deposit || 0), location_text: f.location.trim(),
        lat: coords?.lat ?? null, lng: coords?.lng ?? null, photos, available_from: f.from, available_to: f.to,
      }).select("id").single();
      if (error) throw error;
      toast.success("¡Publicación creada!");
      navigate({ to: "/publicacion/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo publicar");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold">Publicar</h1>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button type="button" key={c.value} onClick={() => setF({ ...f, category: c.value })} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm", f.category === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{c.label}</button>
          ))}
        </div>
        <div><Label htmlFor="t">Título</Label><Input id="t" required maxLength={100} value={f.title} onChange={set("title")} placeholder="Ej.: Tractor 90 HP con arado" /></div>
        <div><Label htmlFor="d">Descripción</Label><Textarea id="d" rows={4} maxLength={2000} value={f.description} onChange={set("description")} placeholder="Estado, condiciones de uso, qué incluye…" /></div>
        <div><Label>Fotos (hasta 6)</Label><PhotoPicker files={files} onChange={setFiles} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="p">Precio por día (XLM)</Label><Input id="p" type="number" min="0.01" step="0.01" required value={f.price} onChange={set("price")} /></div>
          <div><Label htmlFor="dep">Depósito de garantía (XLM)</Label><Input id="dep" type="number" min="0" step="0.01" value={f.deposit} onChange={set("deposit")} /></div>
        </div>
        <div>
          <Label htmlFor="loc">Ubicación (localidad / provincia)</Label>
          <div className="flex gap-2"><Input id="loc" required value={f.location} onChange={set("location")} /><Button type="button" variant="outline" onClick={locate}><LocateFixed />{coords ? "✓" : "GPS"}</Button></div>
          <p className="mt-1 text-xs text-muted-foreground">El GPS permite que otros te encuentren por cercanía.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="fr">Disponible desde</Label><Input id="fr" type="date" min={today} required value={f.from} onChange={set("from")} /></div>
          <div><Label htmlFor="to">Hasta</Label><Input id="to" type="date" min={f.from} required value={f.to} onChange={set("to")} /></div>
        </div>
        <Button className="w-full" size="lg" disabled={busy}>{busy ? "Publicando…" : "Publicar"}</Button>
      </form>
    </div>
  );
}
