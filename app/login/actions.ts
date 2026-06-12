"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin, verifyPin } from "@/lib/auth/pin";
import { setSessionCookie, clearSession } from "@/lib/auth/session";
import {
  checkLoginLock,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth/login-throttle";

const schema = z.object({
  // Número peruano: 9 dígitos que empiezan con 9. Sin prefijo.
  phone: z.string().regex(/^9\d{8}$/, "Tu número: 9 dígitos que empiezan con 9"),
  name: z.string().trim().max(30).optional().default(""),
  pin: z.string().regex(/^\d{6}$/, "El PIN son 6 dígitos"),
});

export type LoginState =
  | { error?: string; needsName?: boolean; phone?: string; pin?: string }
  | undefined;

/**
 * Flujo en 2 pasos por TELÉFONO (identidad única):
 *  - Si el número existe → verifica PIN y entra directo (no pide nombre).
 *  - Si NO existe → pide el nombre (segundo paso) y registra (queda pending).
 */
export async function loginOrRegister(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Valores crudos para devolverlos en caso de error y NO perder lo tipeado.
  const rawPhone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const rawPin = String(formData.get("pin") ?? "");

  const parsed = schema.safeParse({
    phone: rawPhone,
    name: formData.get("name") ?? "",
    pin: rawPin,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      phone: rawPhone,
      pin: rawPin,
    };
  }
  const { phone, name, pin } = parsed.data;
  const db = createAdminClient();

  // Freno anti fuerza-bruta: si el número está bloqueado, ni miramos el PIN.
  const lock = await checkLoginLock(phone);
  if (lock.locked) {
    return {
      error: `Demasiados intentos. Espera ${lock.minutesLeft} min e intenta de nuevo.`,
      phone,
      pin,
    };
  }

  const { data: existing } = await db
    .from("players")
    .select("id, display_name, pin_hash, status, is_admin")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    if (!(await verifyPin(pin, existing.pin_hash))) {
      const st = await recordFailedLogin(phone);
      return {
        error: st.locked
          ? `Demasiados intentos. Espera ${st.minutesLeft} min e intenta de nuevo.`
          : "Número o PIN incorrecto",
        phone,
        pin,
      };
    }
    await clearLoginAttempts(phone);
    await setSessionCookie({
      playerId: existing.id,
      name: existing.display_name,
      isAdmin: existing.is_admin,
    });
    redirect("/");
  }

  // No existe → segundo paso: pedir SOLO el nombre (llevamos teléfono y PIN).
  if (!name) return { needsName: true, phone, pin };

  const pin_hash = await hashPin(pin);
  const { data: created, error } = await db
    .from("players")
    .insert({ phone, display_name: name, pin_hash, status: "pending" })
    .select("id, display_name, is_admin")
    .single();
  if (error || !created) return { error: error?.message ?? "No se pudo crear la cuenta" };
  await setSessionCookie({
    playerId: created.id,
    name: created.display_name,
    isAdmin: created.is_admin,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}
