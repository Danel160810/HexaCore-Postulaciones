// Valores de configuración compartidos por el servidor.
export const ROLE_REVIEWER = process.env.REVIEWER_ROLE_ID || "";
export const ROLE_ADMIN = process.env.ADMIN_ROLE_ID || "";
export const ROLE_MEMBER = process.env.MEMBER_ROLE_ID || null;

export const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";
export const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || null;

/** URL pública de la web. Acepta "dominio.com" o "https://dominio.com/" y siempre devuelve "https://dominio.com". */
export function normalizeUrl(raw: string | undefined) {
  let v = (raw ?? "").trim().replace(/\/+$/, "");
  if (!v) return "http://localhost:3000";
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return v;
}
export const SITE_URL = normalizeUrl(process.env.NEXTAUTH_URL);
export const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || null;

/** Cada cuánto releer roles por REST (si hay token de bot). */
export const ROLE_REFRESH_MS = 10 * 60 * 1000;

