import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBot } from "@/lib/bot-auth";
import { readJson } from "@/lib/http";

const syncInput = z.object({
  members: z
    .array(
      z.object({
        id: z.string().regex(/^\d{17,20}$/),
        inGuild: z.boolean(),
        roles: z.array(z.string()).max(250).default([]),
        username: z.string().optional(),
        globalName: z.string().nullish(),
        avatar: z.string().nullish(),
      })
    )
    .max(100),
});

/**
 * El bot avisa de cambios de roles (o de que alguien salió del servidor).
 * Solo se actualizan usuarios que ya han entrado alguna vez en la web.
 * Así, quitar el rol Reviewer en Discord quita el acceso al panel al instante.
 */
export async function POST(req: Request) {
  const denied = checkBot(req);
  if (denied) return denied;

  const body = await readJson(req, syncInput);
  if ("error" in body) return body.error;

  let updated = 0;
  for (const m of body.data.members) {
    const res = await prisma.user.updateMany({
      where: { id: m.id },
      data: {
        inGuild: m.inGuild,
        roles: m.inGuild ? m.roles : [],
        rolesSyncedAt: new Date(),
        ...(m.username ? { username: m.username } : {}),
        ...(m.globalName !== undefined ? { globalName: m.globalName } : {}),
        ...(m.avatar !== undefined ? { avatar: m.avatar } : {}),
      },
    });
    updated += res.count;
  }
  return NextResponse.json({ ok: true, updated });
}
