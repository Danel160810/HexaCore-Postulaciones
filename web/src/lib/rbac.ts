import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { avatarUrl, fetchMemberAsBot } from "./discord";
import { ROLE_ADMIN, ROLE_MEMBER, ROLE_REFRESH_MS, ROLE_REVIEWER } from "./env";

export type Viewer = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  roles: string[];
  inGuild: boolean;
  /** Puede enviar postulaciones (está en el Discord y, si aplica, tiene el rol Miembro) */
  isMember: boolean;
  isReviewer: boolean;
  isAdmin: boolean;
};

/**
 * Usuario actual con sus permisos. Los roles se guardan en la BD y se refrescan:
 *  1. al iniciar sesión (token OAuth del usuario)
 *  2. cuando el bot detecta un cambio de roles (POST /api/bot/member-sync)
 *  3. por REST con el token del bot si tienen más de 10 minutos
 * Cada petición vuelve a comprobar permisos: quitar el rol en Discord quita el acceso.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;

  let user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  if (Date.now() - user.rolesSyncedAt.getTime() > ROLE_REFRESH_MS) {
    const member = await fetchMemberAsBot(id);
    if (member !== undefined) {
      user = await prisma.user.update({
        where: { id },
        data: {
          roles: member?.roles ?? [],
          inGuild: member !== null,
          rolesSyncedAt: new Date(),
          ...(member?.user
            ? { username: member.user.username, globalName: member.user.global_name, avatar: member.user.avatar }
            : {}),
        },
      });
    }
  }

  const roles = user.inGuild ? user.roles : [];
  const isAdmin = roles.includes(ROLE_ADMIN);
  const isReviewer = isAdmin || roles.includes(ROLE_REVIEWER);
  return {
    id: user.id,
    username: user.username,
    name: user.globalName || user.username,
    avatarUrl: avatarUrl(user.id, user.avatar),
    roles,
    inGuild: user.inGuild,
    isMember: user.inGuild && (!ROLE_MEMBER || roles.includes(ROLE_MEMBER)),
    isReviewer,
    isAdmin,
  };
});

export type Level = "user" | "reviewer" | "admin";

function allowed(v: Viewer, level: Level) {
  if (level === "admin") return v.isAdmin;
  if (level === "reviewer") return v.isReviewer;
  return true;
}

/** Para páginas: redirige si no hay sesión o permisos. */
export async function requireViewer(level: Level = "user", from?: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(from ? `/login?callbackUrl=${encodeURIComponent(from)}` : "/login");
  if (!allowed(v, level)) redirect("/sin-acceso");
  return v;
}

/** Para rutas de API: devuelve el viewer o una respuesta 401/403 lista para devolver. */
export async function apiViewer(
  level: Level = "user"
): Promise<{ viewer: Viewer; error?: never } | { viewer?: never; error: NextResponse }> {
  const v = await getViewer();
  if (!v) return { error: NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }) };
  if (!allowed(v, level))
    return { error: NextResponse.json({ error: "Tu rol de Discord no tiene acceso a esto." }, { status: 403 }) };
  return { viewer: v };
}
