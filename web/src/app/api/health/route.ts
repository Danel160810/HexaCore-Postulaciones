import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { describeDbError } from "@/lib/diagnose";
import { SITE_URL } from "@/lib/env";
import { CREDITOS } from "@/config/creditos";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico rápido: abre /api/health en el navegador.
 * Solo dice si cada cosa está configurada (sí/no). Nunca muestra valores secretos.
 */
export async function GET() {
  const has = (k: string) => !!process.env[k]?.trim();
  const env = {
    POSTGRES_PRISMA_URL: has("POSTGRES_PRISMA_URL"),
    POSTGRES_URL_NON_POOLING: has("POSTGRES_URL_NON_POOLING"),
    NEXTAUTH_URL: has("NEXTAUTH_URL"),
    NEXTAUTH_SECRET: has("NEXTAUTH_SECRET"),
    DISCORD_CLIENT_ID: has("DISCORD_CLIENT_ID"),
    DISCORD_CLIENT_SECRET: has("DISCORD_CLIENT_SECRET"),
    DISCORD_GUILD_ID: has("DISCORD_GUILD_ID"),
    DISCORD_BOT_TOKEN: has("DISCORD_BOT_TOKEN"),
    BOT_API_SECRET: (process.env.BOT_API_SECRET ?? "").length >= 16,
  };

  let database: { ok: boolean; message: string; tables?: Record<string, boolean>; forms?: number };
  try {
    const rows = await prisma.$queryRaw<{ name: string; exists: boolean }[]>`
      SELECT t.name, to_regclass('public."' || t.name || '"') IS NOT NULL AS exists
      FROM unnest(ARRAY['User','Form','Question','Application','ApplicationEvent','InternalComment','OutboxEvent','Counter','RateLimit']) AS t(name)`;
    const tables = Object.fromEntries(rows.map((r) => [r.name, r.exists]));
    const missing = rows.filter((r) => !r.exists).map((r) => r.name);
    if (missing.length) {
      database = { ok: false, message: `Conecta, pero faltan tablas: ${missing.join(", ")}. Ejecuta prisma/setup.sql en Supabase.`, tables };
    } else {
      const forms = await prisma.form.count();
      database = { ok: true, message: "Conectada y con todas las tablas.", tables, forms };
    }
  } catch (e) {
    database = { ok: false, message: describeDbError(e) };
  }

  const ok = database.ok && Object.entries(env).every(([k, v]) => v || k === "DISCORD_BOT_TOKEN");
  return NextResponse.json(
    {
      ok,
      sistema: `${CREDITOS.proyecto} · Creado por ${CREDITOS.autor} (Discord: ${CREDITOS.discord})`,
      database,
      env,
      discordRedirectUri: `${SITE_URL}/api/auth/callback/discord`,
      hint: "discordRedirectUri tiene que estar copiado EXACTAMENTE en Discord → OAuth2 → Redirects.",
    },
    { status: ok ? 200 : 500 }
  );
}
