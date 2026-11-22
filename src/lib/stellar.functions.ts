import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ESCROW_ADDRESS, HORIZON_URL } from "./constants";

export const verifyStellarPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; txHash: string }) => {
    const txHash = String(input.txHash ?? "").trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(txHash)) throw new Error("El hash de transacción no es válido (64 caracteres hex).");
    return { bookingId: String(input.bookingId), txHash };
  })
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase.from("bookings").select("*").eq("id", data.bookingId).maybeSingle();
    if (error || !b) throw new Error("Reserva no encontrada.");
    if (b.renter_id !== context.userId) throw new Error("Solo el arrendatario puede registrar el pago.");
    if (b.status !== "aceptada") throw new Error("La reserva debe estar aceptada para pagar.");

    const txRes = await fetch(`${HORIZON_URL}/transactions/${data.txHash}`);
    if (txRes.status === 404) throw new Error("La transacción no existe en la red Stellar (testnet).");
    if (!txRes.ok) throw new Error("No se pudo consultar la red Stellar. Intenta de nuevo.");
    const tx = (await txRes.json()) as { successful: boolean; memo?: string; memo_type?: string };
    if (!tx.successful) throw new Error("La transacción falló en la red.");
    if (tx.memo !== b.payment_memo) throw new Error(`El memo no coincide. Debe ser ${b.payment_memo}.`);

    const opsRes = await fetch(`${HORIZON_URL}/transactions/${data.txHash}/operations?limit=50`);
    const ops = (await opsRes.json()) as { _embedded: { records: Array<{ type: string; to?: string; asset_type?: string; amount?: string }> } };
    const paid = ops._embedded.records
      .filter((o) => o.type === "payment" && o.to === ESCROW_ADDRESS && o.asset_type === "native")
      .reduce((s, o) => s + Number(o.amount ?? 0), 0);
    if (paid + 1e-7 < Number(b.total_amount)) throw new Error(`Monto insuficiente: se recibieron ${paid} XLM de ${b.total_amount} XLM.`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({ status: "pagada", payment_tx_hash: data.txHash, payment_verified_at: new Date().toISOString() })
      .eq("id", b.id)
      .eq("status", "aceptada");
    if (upErr) throw new Error(upErr.code === "23505" ? "Esa transacción ya fue usada en otra reserva." : "No se pudo registrar el pago.");
    return { ok: true, paid };
  });
