"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Mantiene un websocket abierto con Supabase. Cuando cambia `matches` o `rounds`
 * (el cron escribe un marcador, el admin abre una fecha…), refresca los datos del
 * servidor sin recargar la página. Es el "trigger que espera el cambio": vigila
 * NUESTRA base (la única que podemos vigilar) y empuja a la pantalla al instante.
 *
 * No renderiza nada; se monta en las pantallas con datos en vivo.
 */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("polla-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () =>
        router.refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () =>
        router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
