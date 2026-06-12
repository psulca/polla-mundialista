import "server-only";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Hash de PIN con scrypt (sin dependencias nativas). Formato: "salt:hash".
 * El PIN nunca se guarda en claro.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/** Verifica un PIN contra el hash almacenado, en tiempo constante. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

/** Valida que el PIN sean exactamente 6 dígitos. */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
