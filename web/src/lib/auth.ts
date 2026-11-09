import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./prisma";
import { fetchOwnMember } from "./discord";
import { describeDbError } from "./diagnose";

type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null };

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      // Discord ahora añade "iss" a la redirección (RFC 9207). Sin esto, openid-client
      // falla con "issuer must be configured on the issuer" y el login da OAuthCallback.
      issuer: "https://discord.com",
      // Solo pedimos identidad y roles del servidor. Nada de email ni de leer mensajes.
      authorization: { params: { scope: "identify guilds.members.read", prompt: "none" } },
    }),
  ],
  // Los errores de login aparecen en Vercel → Logs con el prefijo [next-auth]
  logger: {
    error(code, metadata) {
      console.error(`[next-auth][error][${code}]`, metadata);
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile || !account.access_token) return false;
      const p = profile as unknown as DiscordUser;

      if (account.provider !== "discord") return false;

      // Leemos los roles del usuario en el servidor con SU token.
      let member: Awaited<ReturnType<typeof fetchOwnMember>> | undefined;
      try {
        member = await fetchOwnMember(account.access_token);
      } catch (e) {
        console.error("[auth] No se pudieron leer los roles:", e);
        member = undefined; // dejamos entrar, conservando los roles que ya tuviéramos
      }

      const base = {
        username: p.username,
        globalName: p.global_name ?? null,
        avatar: p.avatar ?? null,
      };
      const roleData =
        member === undefined
          ? {}
          : { roles: member?.roles ?? [], inGuild: member !== null, rolesSyncedAt: new Date() };

      try {
        await prisma.user.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          ...base,
          roles: member?.roles ?? [],
          inGuild: member != null,
          // Si no pudimos leer los roles, forzamos un refresco por REST en la siguiente petición
          rolesSyncedAt: member === undefined ? new Date(0) : new Date(),
        },
        update: { ...base, ...roleData },
        });
      } catch (e) {
        // Sin base de datos no podemos guardar al usuario: lo explicamos en /login en vez de un error genérico
        console.error("[auth] Error guardando el usuario:", describeDbError(e), e);
        return "/login?error=Database";
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) token.sub = (profile as unknown as DiscordUser).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
