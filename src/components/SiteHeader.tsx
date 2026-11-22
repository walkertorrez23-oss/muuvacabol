import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Compass, Home, PlusCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const link = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";
  const active = { className: "text-foreground" };
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="font-display text-xl font-bold text-primary">Muuvaca</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/explorar" className={link} activeProps={active}>Explorar</Link>
          <Link to="/publicar" className={link} activeProps={active}>Publicar</Link>
          <Link to="/reservas" className={link} activeProps={active}>Mis reservas</Link>
          <Link to="/cuenta" className={link} activeProps={active}>Mi cuenta</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut}>Salir</Button>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Ingresar</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const items = [
    { to: "/", label: "Inicio", Icon: Home },
    { to: "/explorar", label: "Explorar", Icon: Compass },
    { to: "/publicar", label: "Publicar", Icon: PlusCircle },
    { to: "/reservas", label: "Reservas", Icon: CalendarCheck },
    { to: "/cuenta", label: "Cuenta", Icon: User },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
      {items.map(({ to, label, Icon }) => (
        <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
