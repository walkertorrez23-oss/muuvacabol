import { ESCROW_ADDRESS, STELLAR_PASSPHRASE } from "./constants";

/** SEP-7 payment URI, readable by Stellar wallets (LOBSTR, Freighter, etc.). */
export function sep7PayUri(amount: number, memo: string) {
  const p = new URLSearchParams({
    destination: ESCROW_ADDRESS,
    amount: amount.toFixed(2),
    memo,
    memo_type: "MEMO_TEXT",
    network_passphrase: STELLAR_PASSPHRASE,
  });
  return `web+stellar:pay?${p.toString()}`;
}

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
