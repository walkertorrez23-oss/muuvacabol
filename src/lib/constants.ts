export const CATEGORIES = [
  { value: "maquinaria", label: "Maquinaria" },
  { value: "herramienta", label: "Herramientas" },
  { value: "ganado", label: "Ganado" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** Muuvaca commission applied to the rental amount (not to the deposit). Must match the DB trigger. */
export const COMMISSION_RATE = 0.05;

/** Stellar test network (demo). Payments go to Muuvaca's custody account. */
export const STELLAR_NETWORK = "testnet" as const;
export const STELLAR_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const ESCROW_ADDRESS = "GANPSWUURHGMU4XW5RZ6NFSFA5ZCXEEJMGCIZFUCFHKUQEGY5YBHSPQT";
export const explorerTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

export const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada",
  aceptada: "Aceptada",
  pagada: "Pagada",
  entregada: "Entregada",
  devuelta: "Devuelta",
  cerrada: "Cerrada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};
