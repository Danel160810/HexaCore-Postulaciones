import { headers } from "next/headers";
import { prisma } from "./prisma";
import { fail } from "./http";

/**
 * Límite de peticiones guardado en Supabase (prisma/setup.sql, apartado 2), así vale para todas
 * las instancias de Vercel a la vez. Si la base de datos falla, deja pasar (no rompe la web).
 *
 * Devuelve null si se permite, o la respuesta 429 lista para devolver.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  try {
    const rows = await prisma.$queryRaw<{ wait: number }[]>`SELECT rate_hit(${key}, ${max}::int, ${windowSeconds}::int) AS wait`;
    const wait = Number(rows[0]?.wait ?? 0);
    if (wait > 0) {
      const res = fail(429, `Demasiados intentos. Prueba otra vez en ${wait < 60 ? `${wait} s` : `${Math.ceil(wait / 60)} min`}.`, {
        retryAfter: wait,
      });
      res.headers.set("Retry-After", String(wait));
      return res;
    }
  } catch (e) {
    console.warn("[rate-limit] sin límite (BD):", e instanceof Error ? e.message.split("\n")[0] : e);
  }
  return null;
}

/** IP del visitante (Vercel la pone en x-forwarded-for; la primera es la real). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64);
}
