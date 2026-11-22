import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, CalendarRange, HandCoins, ShieldCheck, Star, Tractor, Wrench, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-campo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Muuvaca — Alquila maquinaria, herramientas y ganado con garantía" },
      { name: "description", content: "Publica o reserva maquinaria, herramientas y ganado entre productores. Actas con fotos, depósito de garantía y pagos registrados en Stellar." },
      { property: "og:title", content: "Muuvaca — Alquiler entre productores con garantía" },
      { property: "og:description", content: "Actas con fotos, depósito de garantía y pago por QR en la red Stellar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { Icon: Tractor, t: "Publica", d: "El dueño sube fotos, precio por día, depósito y fechas disponibles." },
  { Icon: CalendarRange, t: "Reserva", d: "El productor busca lo que tiene cerca y reserva desde el celular." },
  { Icon: HandCoins, t: "Paga por QR", d: "Alquiler y depósito se pagan en Stellar; la transacción queda verificable." },
  { Icon: Camera, t: "Acta con fotos", d: "Entrega y devolución se registran con fotos y una huella digital." },
  { Icon: Star, t: "Califica", d: "Se libera el depósito y ambos se califican: tu historial crece." },
];

function Index() {
  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Tractor y ganado en el campo al atardecer" width={1600} height={912} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0 -z-10" />
        <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-32 text-primary-foreground">
          <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-4 w-4" /> Respaldado por la red Stellar
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">Lo que tu campo necesita, del vecino que lo tiene.</h1>
          <p className="mt-5 max-w-xl text-lg opacity-90">Presta y alquila maquinaria, herramientas y ganado con depósito de garantía y un registro en el que ambas partes pueden confiar.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/explorar">Buscar cerca de mí</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/publicar">Publicar lo mío</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold md:text-4xl">Cómo funciona</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {steps.map(({ Icon, t, d }, i) => (
            <li key={t} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <Icon className="h-6 w-6 text-primary" />
                <span className="font-display text-2xl text-muted-foreground">{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            { Icon: Tractor, t: "Maquinaria", d: "Tractores, sembradoras, cosechadoras, acoplados." },
            { Icon: Wrench, t: "Herramientas", d: "Motosierras, bombas, soldadoras, equipos de riego." },
            { Icon: Beef, t: "Ganado", d: "Reproductores, animales de trabajo y préstamo temporal." },
          ].map(({ Icon, t, d }) => (
            <Link key={t} to="/explorar" className="rounded-2xl bg-primary-foreground/10 p-6 transition hover:bg-primary-foreground/15">
              <Icon className="h-8 w-8" />
              <h3 className="mt-3 text-2xl font-semibold">{t}</h3>
              <p className="mt-1 text-sm opacity-80">{d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-3xl font-bold">Confianza que se puede verificar</h2>
            <p className="mt-3 text-muted-foreground">Cada pago queda en la red Stellar con un memo único de la reserva. Cada acta guarda una huella digital (SHA-256) de sus fotos y notas. Tu perfil muestra alquileres cerrados, calificaciones y enlaces a las transacciones.</p>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="rounded-xl bg-muted p-4"><b>Depósito de garantía:</b> se libera al confirmar la devolución.</li>
            <li className="rounded-xl bg-muted p-4"><b>Comisión Muuvaca:</b> 5% del alquiler, nunca del depósito.</li>
            <li className="rounded-xl bg-muted p-4"><b>Demo:</b> los pagos usan la red de pruebas de Stellar (testnet), sin dinero real.</li>
          </ul>
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">Muuvaca · Alquiler entre productores</footer>
    </div>
  );
}
