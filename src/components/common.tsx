import type { ReactNode } from "react";
import { Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/constants";
import { usePhotoUrls } from "@/lib/photos";
import { cn } from "@/lib/utils";

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{message}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "cerrada" ? "bg-success text-primary-foreground"
    : status === "rechazada" || status === "cancelada" ? "bg-destructive/15 text-destructive"
    : status === "solicitada" ? "bg-accent/25 text-accent-foreground"
    : "bg-primary/15 text-primary";
  return <Badge className={cn("border-0", tone)}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-accent text-accent" : "text-border"} />
      ))}
    </span>
  );
}

export function PhotoGrid({ paths, className }: { paths: string[]; className?: string }) {
  const { data, isLoading } = usePhotoUrls(paths);
  if (!paths.length) return <p className="text-sm text-muted-foreground">Sin fotos.</p>;
  if (isLoading) return <Loading label="Cargando fotos…" />;
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {(data ?? []).map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt={`Foto ${i + 1}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
        </a>
      ))}
    </div>
  );
}

export function Cover({ path, alt, className }: { path?: string | undefined; alt: string; className?: string }) {
  const { data } = usePhotoUrls(path ? [path] : []);
  const url = data?.[0];
  return url ? (
    <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />
  ) : (
    <div className={cn("bg-muted", className)} />
  );
}
