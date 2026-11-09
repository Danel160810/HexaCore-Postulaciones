import { BOT_TOKEN, GUILD_ID } from "./env";

const API = "https://discord.com/api/v10";

export type DiscordMember = {
  roles: string[];
  nick: string | null;
  user?: { id: string; username: string; global_name: string | null; avatar: string | null };
};

/**
 * Lee el miembro con el token OAuth del propio usuario (scope guilds.members.read).
 * Devuelve null si no está en el servidor.
 */
export async function fetchOwnMember(accessToken: string): Promise<DiscordMember | null> {
  const res = await fetch(`${API}/users/@me/guilds/${GUILD_ID}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Discord respondió ${res.status} al leer el miembro`);
  return (await res.json()) as DiscordMember;
}

/**
 * Lee el miembro con el token del bot. Devuelve:
 *  - DiscordMember si está en el servidor
 *  - null si no está
 *  - undefined si no se pudo saber (sin token, rate limit, caída de Discord…)
 */
export async function fetchMemberAsBot(userId: string): Promise<DiscordMember | null | undefined> {
  if (!BOT_TOKEN || !GUILD_ID) return undefined;
  try {
    const res = await fetch(`${API}/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as DiscordMember;
  } catch {
    return undefined;
  }
}

export { avatarUrl } from "./avatar";

export const isSnowflake = (v: string) => /^\d{17,20}$/.test(v);
