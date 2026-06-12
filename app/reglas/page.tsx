import { Screen } from "@/components/brand/screen";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SmartPhone01Icon,
  PencilEdit02Icon,
  SquareLock02Icon,
  ChampionIcon,
  FootballIcon,
} from "@hugeicons/core-free-icons";

type IconType = React.ComponentProps<typeof HugeiconsIcon>["icon"];

function Rule({
  badge,
  badgeClass,
  title,
  children,
}: {
  badge: React.ReactNode;
  badgeClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card px-4 py-4">
      <span
        className={`font-display flex size-11 shrink-0 items-center justify-center rounded-xl text-xl ${badgeClass}`}
      >
        {badge}
      </span>
      <div>
        <div className="font-bold text-foreground">{title}</div>
        <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function IconBadge({ icon }: { icon: IconType }) {
  return <HugeiconsIcon icon={icon} size={22} strokeWidth={2} />;
}

export default function ReglasPage() {
  return (
    <Screen header={<h1 className="font-display text-4xl text-foreground">Reglas</h1>}>
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-neon">Puntaje</h2>
        <Rule badge="+3" badgeClass="bg-gold text-black" title="Marcador exacto">
          Aciertas el resultado exacto (local y visitante). Ej: predijiste 2-1 y salió 2-1.
        </Rule>
        <Rule badge="+1" badgeClass="bg-neon text-black" title="Resultado acertado">
          Aciertas quién gana (o el empate) pero no el marcador. Ej: predijiste 2-0 y salió 1-0.
        </Rule>
        <Rule badge="0" badgeClass="bg-white/10 text-muted-foreground" title="Errado">
          No acertaste ni el ganador. Cero puntos, a la próxima.
        </Rule>

        <h2 className="font-display mt-4 text-xl text-azure">Cómo funciona</h2>
        <Rule
          badge={<IconBadge icon={SmartPhone01Icon} />}
          badgeClass="bg-white/8 text-foreground"
          title="Tu cuenta"
        >
          Entras con tu número y un PIN. El admin te aprueba después de tu pago por WhatsApp.
        </Rule>
        <Rule
          badge={<IconBadge icon={PencilEdit02Icon} />}
          badgeClass="bg-white/8 text-foreground"
          title="Carga tus pronósticos"
        >
          Predice los marcadores de la fecha abierta. Puedes editar hasta que empiece cada partido.
        </Rule>
        <Rule
          badge={<IconBadge icon={SquareLock02Icon} />}
          badgeClass="bg-white/8 text-foreground"
          title="Se cierra y se revela"
        >
          Cuando arranca el partido, tu pronóstico se congela y se revelan los de todos. Sin
          ventajas, sin trampas.
        </Rule>
        <Rule
          badge={<IconBadge icon={ChampionIcon} />}
          badgeClass="bg-white/8 text-foreground"
          title="Ranking"
        >
          A medida que entran los resultados, se actualizan los puntos y el ranking. El que más
          suma, gana el pozo.
        </Rule>
        <Rule
          badge={<IconBadge icon={FootballIcon} />}
          badgeClass="bg-white/8 text-foreground"
          title="Eliminatorias"
        >
          En octavos, cuartos, semis y final el marcador se cuenta a los 90 minutos. El alargue y
          los penales no cambian tu pronóstico.
        </Rule>
      </div>
    </Screen>
  );
}
