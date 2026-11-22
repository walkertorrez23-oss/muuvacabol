import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, ExternalLink, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBox, Loading, PhotoGrid, StatusBadge } from "@/components/common";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ESCROW_ADDRESS, explorerTx } from "@/lib/constants";
import { fmtXLM } from "@/lib/pricing";
import { uploadPhotos } from "@/lib/photos";
import { sep7PayUri, sha256Hex } from "@/lib/stellar";
import { verifyStellarPayment } from "@/lib/stellar.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reservas/$id")({
  head: () => ({
    meta: [
      { title: "Reserva — Muuvaca" },
      { name: "description", content: "Pago, actas de entrega y devolución, y calificaciones." },
      { property: "og:title", content: "Reserva — Muuvaca" },
      { property: "og:description", content: "Seguimiento de una reserva con garantía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reserva,
});

const FLOW = ["solicitada", "aceptada", "pagada", "entregada", "devuelta", "cerrada"];

function Reserva() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const [b, h, r] = await Promise.all([
        supabase.from("bookings").select("*, listing:listings(id, title), renter:profiles!bookings_renter_id_fkey(id, display_name, phone), owner:profiles!bookings_owner_id_fkey(id, display_name, phone)").eq("id", id).maybeSingle(),
        supabase.from("handover_records").select("*").eq("booking_id", id),
        supabase.from("reviews").select("*").eq("booking_id", id),
      ]);
      if (b.error || !b.data) throw new Error("not found");
      return { b: b.data, records: h.data ?? [], reviews: r.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["booking", id] });
  const [busy, setBusy] = useState(false);

  if (q.isLoading) return <Loading />;
  if (!q.data) return <div className="mx-auto max-w-3xl p-6"><ErrorBox message="Reserva no encontrada." /></div>;
  const { b, records, reviews } = q.data;
  const isOwner = b.owner_id === user.id;
  const other = isOwner ? b.renter : b.owner;
  const entrega = records.find((r) => r.kind === "entrega");
  const devolucion = records.find((r) => r.kind === "devolucion");
  const step = FLOW.indexOf(b.status);

  async function setStatus(status: string, msg: string) {
    setBusy(true);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", b.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(msg);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/publicacion/$id" params={{ id: b.listing?.id ?? "" }} className="text-sm text-primary underline">{b.listing?.title}</Link>
          <h1 className="text-3xl font-bold">Reserva {b.payment_memo}</h1>
          <p className="text-muted-foreground">{b.start_date} → {b.end_date} · {b.days} días · {isOwner ? "Arrendatario" : "Dueño"}: <Link to="/perfil/$id" params={{ id: other?.id ?? "" }} className="underline">{other?.display_name}</Link></p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {step >= 0 && (
        <ol className="grid grid-cols-6 gap-1">
          {FLOW.map((s, i) => <li key={s} className={cn("h-2 rounded-full", i <= step ? "bg-primary" : "bg-muted")} title={s} />)}
        </ol>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 text-sm">
        <dl className="grid grid-cols-2 gap-y-1">
          <dt>Alquiler</dt><dd className="text-right">{fmtXLM(Number(b.rental_amount))}</dd>
          <dt>Depósito de garantía</dt><dd className="text-right">{fmtXLM(Number(b.deposit_amount))}</dd>
          <dt className="font-semibold">Total</dt><dd className="text-right font-semibold">{fmtXLM(Number(b.total_amount))}</dd>
          {isOwner && <><dt className="text-muted-foreground">Comisión Muuvaca (5%)</dt><dd className="text-right text-muted-foreground">−{fmtXLM(Number(b.commission_amount))}</dd>
          <dt className="text-muted-foreground">Recibes</dt><dd className="text-right text-muted-foreground">{fmtXLM(Number(b.rental_amount) - Number(b.commission_amount))}</dd></>}
        </dl>
        {step >= 1 && other?.phone && <p className="mt-3 text-muted-foreground">Contacto: {other.phone}</p>}
      </section>

      {b.status === "solicitada" && (isOwner ? (
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => setStatus("aceptada", "Reserva aceptada")}>Aceptar</Button>
          <Button disabled={busy} variant="outline" onClick={() => setStatus("rechazada", "Reserva rechazada")}>Rechazar</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-muted p-4 text-sm">
          Esperando que el dueño acepte.
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("cancelada", "Reserva cancelada")}>Cancelar</Button>
        </div>
      ))}

      {b.status === "aceptada" && (isOwner ? <p className="rounded-2xl bg-muted p-4 text-sm">Esperando el pago del arrendatario.</p> : <PaySection b={b} onPaid={refresh} />)}

      {b.payment_tx_hash && (
        <a href={explorerTx(b.payment_tx_hash)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm hover:bg-muted">
          <CheckCircle2 className="h-5 w-5 text-success" /> Pago verificado en Stellar <span className="truncate font-mono text-xs text-muted-foreground">{b.payment_tx_hash}</span> <ExternalLink className="ml-auto h-4 w-4 shrink-0" />
        </a>
      )}

      {(b.status === "pagada" || entrega) && <ActaSection kind="entrega" bookingId={b.id} userId={user.id} record={entrega} canCreate={b.status === "pagada"} onDone={async () => { await setStatus("entregada", "Entrega registrada"); }} />}
      {(b.status === "entregada" || devolucion) && <ActaSection kind="devolucion" bookingId={b.id} userId={user.id} record={devolucion} canCreate={b.status === "entregada"} onDone={async () => { await setStatus("devuelta", "Devolución registrada"); }} />}

      {b.status === "devuelta" && (isOwner ? (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <p className="text-sm">Revisa el acta de devolución. Al confirmar, se libera el depósito de {fmtXLM(Number(b.deposit_amount))} al arrendatario y se cierra la reserva.</p>
          <Button className="mt-3" disabled={busy} onClick={() => setStatus("cerrada", "Devolución confirmada · depósito liberado")}>Confirmar devolución y liberar depósito</Button>
        </div>
      ) : <p className="rounded-2xl bg-muted p-4 text-sm">Esperando que el dueño confirme la devolución para liberar tu depósito.</p>)}

      {b.status === "cerrada" && (
        <>
          <p className="rounded-2xl bg-success/10 p-4 text-sm">Reserva cerrada. Depósito liberado el {b.deposit_released_at ? new Date(b.deposit_released_at).toLocaleString("es") : "—"}.</p>
          <ReviewSection bookingId={b.id} userId={user.id} revieweeId={other?.id ?? ""} revieweeName={other?.display_name ?? ""} reviews={reviews} onDone={refresh} />
        </>
      )}
    </div>
  );
}

function PaySection({ b, onPaid }: { b: { id: string; total_amount: number; payment_memo: string | null }; onPaid: () => void }) {
  const verify = useServerFn(verifyStellarPayment);
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const uri = sep7PayUri(Number(b.total_amount), b.payment_memo ?? "");
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copiado"));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verify({ data: { bookingId: b.id, txHash: hash } });
      toast.success("¡Pago verificado en Stellar!");
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo verificar");
    } finally { setBusy(false); }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold">Pagar con Stellar</h2>
      <p className="text-sm text-muted-foreground">Escanea con una billetera Stellar configurada en <b>testnet</b> (demo, sin dinero real). Envía exactamente el total con el memo indicado.</p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-xl bg-card p-3 ring-1 ring-border"><QRCodeSVG value={uri} size={180} /></div>
        <dl className="w-full space-y-2 text-sm">
          <div><dt className="text-muted-foreground">Monto</dt><dd className="font-semibold">{Number(b.total_amount).toFixed(2)} XLM</dd></div>
          <div><dt className="text-muted-foreground">Memo (obligatorio)</dt><dd className="flex items-center gap-2 font-mono">{b.payment_memo}<button type="button" aria-label="Copiar memo" onClick={() => copy(b.payment_memo ?? "")}><Copy className="h-4 w-4" /></button></dd></div>
          <div><dt className="text-muted-foreground">Cuenta de custodia Muuvaca</dt><dd className="flex items-center gap-2 break-all font-mono text-xs">{ESCROW_ADDRESS}<button type="button" aria-label="Copiar dirección" onClick={() => copy(ESCROW_ADDRESS)}><Copy className="h-4 w-4 shrink-0" /></button></dd></div>
        </dl>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <Label htmlFor="h">Hash de la transacción</Label>
        <div className="flex gap-2">
          <Input id="h" required value={hash} onChange={(e) => setHash(e.target.value)} placeholder="64 caracteres" className="font-mono text-xs" />
          <Button disabled={busy}>{busy ? "Verificando…" : "Verificar pago"}</Button>
        </div>
      </form>
    </section>
  );
}

type Rec = { id: string; photos: string[]; notes: string; content_hash: string; created_at: string };

function ActaSection({ kind, bookingId, userId, record, canCreate, onDone }: { kind: "entrega" | "devolucion"; bookingId: string; userId: string; record?: Rec | undefined; canCreate: boolean; onDone: () => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const title = kind === "entrega" ? "Acta de entrega" : "Acta de devolución";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) { toast.error("Agrega al menos una foto del estado"); return; }
    setBusy(true);
    try {
      const photos = await uploadPhotos(userId, files, `actas/${bookingId}`);
      const created_at = new Date().toISOString();
      const content_hash = await sha256Hex(JSON.stringify({ bookingId, kind, photos, notes, created_by: userId, created_at }));
      const { error } = await supabase.from("handover_records").insert({ booking_id: bookingId, kind, photos, notes, created_by: userId, content_hash, created_at });
      if (error) throw error;
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el acta");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {record ? (
        <>
          <PhotoGrid paths={record.photos} />
          {record.notes && <p className="text-sm">{record.notes}</p>}
          <p className="flex items-start gap-2 break-all text-xs text-muted-foreground"><Fingerprint className="h-4 w-4 shrink-0" /> Huella SHA-256: {record.content_hash} · {new Date(record.created_at).toLocaleString("es")}</p>
        </>
      ) : canCreate ? (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-muted-foreground">Cualquiera de las dos partes puede registrarla, en presencia de la otra. Fotografía el estado general, detalles y daños.</p>
          <PhotoPicker files={files} onChange={setFiles} max={8} />
          <Textarea placeholder="Observaciones (horas de uso, combustible, estado del animal…)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          <Button disabled={busy}>{busy ? "Guardando…" : `Registrar ${kind === "entrega" ? "entrega" : "devolución"}`}</Button>
        </form>
      ) : null}
    </section>
  );
}

function ReviewSection({ bookingId, userId, revieweeId, revieweeName, reviews, onDone }: { bookingId: string; userId: string; revieweeId: string; revieweeName: string; reviews: Array<{ reviewer_id: string; rating: number; comment: string }>; onDone: () => void }) {
  const mine = reviews.find((r) => r.reviewer_id === userId);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  if (mine) return <p className="rounded-2xl border border-border bg-card p-4 text-sm">Calificaste a {revieweeName} con {mine.rating}/5. ¡Gracias!</p>;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({ booking_id: bookingId, reviewer_id: userId, reviewee_id: revieweeId, rating, comment: comment.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Calificación enviada");
    onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold">Califica a {revieweeName}</h2>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} className={cn("h-10 w-10 rounded-full border text-sm font-semibold", n <= rating ? "border-accent bg-accent text-accent-foreground" : "border-border")}>{n}</button>
        ))}
      </div>
      <Textarea placeholder="¿Cómo fue la experiencia? (puntualidad, estado, trato)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      <Button disabled={busy}>{busy ? "Enviando…" : "Enviar calificación"}</Button>
    </form>
  );
}
