import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Cover } from "./common";
import { categoryLabel } from "@/lib/constants";
import { fmtXLM } from "@/lib/pricing";

export function ListingCard({ l, distance }: { l: Tables<"listings">; distance?: number | null }) {
  return (
    <Link to="/publicacion/$id" params={{ id: l.id }} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5">
      <Cover path={l.photos[0]} alt={l.title} className="aspect-[4/3] w-full" />
      <div className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-earth">{categoryLabel(l.category)}</p>
        <h3 className="line-clamp-1 text-lg font-semibold group-hover:text-primary">{l.title}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {l.location_text || "Ubicación no indicada"}
          {distance != null && <span>· {distance.toFixed(0)} km</span>}
        </p>
        <p className="pt-1 font-semibold">{fmtXLM(Number(l.price_per_day))} <span className="text-sm font-normal text-muted-foreground">/ día</span></p>
      </div>
    </Link>
  );
}
