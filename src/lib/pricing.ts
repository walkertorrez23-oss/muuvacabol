import { COMMISSION_RATE } from "./constants";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Inclusive day count between two ISO dates (YYYY-MM-DD). */
export function countDays(start: string, end: string): number {
  const ms = Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z");
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.round(ms / 86400000) + 1;
}

export function quote(pricePerDay: number, deposit: number, start: string, end: string) {
  const days = countDays(start, end);
  const rental = r2(days * pricePerDay);
  const commission = r2(rental * COMMISSION_RATE);
  return { days, rental, deposit: r2(deposit), commission, total: r2(rental + deposit), ownerReceives: r2(rental - commission) };
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtXLM = (n: number) => `${Number(n).toLocaleString("es", { maximumFractionDigits: 2 })} XLM`;
