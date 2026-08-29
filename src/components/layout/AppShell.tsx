import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Plane,
  Map as MapIcon,
  SprayCan,
  Radar,
  Activity,
  ScrollText,
  Settings as SettingsIcon,
  Menu,
  X,
  Satellite,
  BatteryMedium,
  SignalHigh,
  OctagonX,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSettings, useTelemetry } from "@/hooks/useTelemetry";
import { authService } from "@/services/auth";
import { droneApi } from "@/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-flight", label: "Live Flight", icon: Plane },
  { to: "/mission-planner", label: "Mission Planner", icon: MapIcon },
  { to: "/spray-control", label: "Spray Control", icon: SprayCan },
  { to: "/sensors", label: "Sensors", icon: Radar },
  { to: "/telemetry", label: "Telemetry", icon: Activity },
  { to: "/flight-logs", label: "Flight Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function useSession() {
  return useSyncExternalStore(
    (l) => authService.subscribe(l),
    () => authService.getSession(),
    () => null,
  );
}

function Clock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs tabular-nums text-muted-foreground">{now}</span>;
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useTelemetry();
  const settings = useSettings();
  const session = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    settingsHydrate();
    setChecked(true);
  }, []);

  useEffect(() => {
    if (checked && !authService.getSession()) navigate({ to: "/login" });
  }, [checked, session, navigate]);

  const batteryTone =
    t.battery_percentage < 15 ? "text-destructive" : t.battery_percentage < settings.minBattery ? "text-warning" : "text-primary";

  const emergency = async () => {
    const res = await droneApi.emergencyStop();
    toast[res.ok ? "warning" : "error"](res.message, {
      description: res.simulated ? "DEMO MODE: simulated state changed only — no hardware command sent." : undefined,
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
          <div className="grid size-9 place-items-center rounded-md border border-primary/40 bg-primary/10">
            <Plane className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">AgriDrone</p>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Ground Control
            </p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <p className="truncate text-[11px] text-muted-foreground">{session?.email ?? "operator"}</p>
          <button
            onClick={async () => {
              await authService.signOut();
              navigate({ to: "/login" });
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="size-5 text-muted-foreground" />
            </button>
            <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
              {settings.droneId}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {t.connection === "connected" ? (
                <Wifi className="size-3.5 text-primary" />
              ) : (
                <WifiOff className="size-3.5 text-destructive" />
              )}
              {t.connection}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Satellite className="size-3.5 text-info" />
              {t.gps_satellites} sats · {t.gps_fix.toUpperCase()}
            </span>
            <span className={cn("flex items-center gap-1.5 text-xs", batteryTone)}>
              <BatteryMedium className="size-3.5" />
              {t.battery_percentage.toFixed(0)}% · {t.battery_voltage.toFixed(1)}V
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SignalHigh className="size-3.5" />
              {t.signal_strength}%
            </span>
            <div className="ml-auto flex items-center gap-3">
              <Clock />
              {settings.simulationMode && (
                <span className="rounded border border-warning/50 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-warning">
                  Simulation Mode
                </span>
              )}
              <button
                onClick={emergency}
                className="flex items-center gap-1.5 rounded-md border border-destructive/60 bg-destructive/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-destructive transition-colors hover:bg-destructive/25"
              >
                <OctagonX className="size-3.5" /> Emergency Stop
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mb-4 lg:mb-5">
            <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function settingsHydrate() {
  // Imported lazily to keep this module SSR-safe.
  void import("@/lib/config").then((m) => m.settingsStore.hydrate());
}
