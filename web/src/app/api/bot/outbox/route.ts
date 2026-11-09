import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBot } from "@/lib/bot-auth";
import { describeDbError } from "@/lib/diagnose";

export const dynamic = "force-dynamic";

const LOCK_MS = 60_000;

/**
 * El bot recoge aquí los eventos pendientes.
 * GET /api/bot/outbox?limit=10   Authorization: Bearer BOT_API_SECRET
 * Cada evento queda "reservado" 60 s; si el bot no confirma, vuelve a la cola.
 */
export async function GET(req: Request) {
  const denied = checkBot(req);
  if (denied) return denied;
  try {
    return await claim(req);
  } catch (e) {
    console.error("[bot/outbox]", e);
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}

async function claim(req: Request) {
  const limit = Math.min(25, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 10));
  const now = new Date();
  const claimable = {
    OR: [{ status: "PENDING" as const }, { status: "PROCESSING" as const, lockedUntil: { lt: now } }],
  };

  const candidates = await prisma.outboxEvent.findMany({
    where: claimable,
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  if (candidates.length === 0) return NextResponse.json({ events: [] });

  const ids = candidates.map((c) => c.id);
  const lockedUntil = new Date(now.getTime() + LOCK_MS);
  await prisma.outboxEvent.updateMany({
    where: { id: { in: ids }, ...claimable },
    data: { status: "PROCESSING", lockedUntil, attempts: { increment: 1 } },
  });

  const events = await prisma.outboxEvent.findMany({
    where: { id: { in: ids }, status: "PROCESSING", lockedUntil },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, payload: true, attempts: true, createdAt: true },
  });
  return NextResponse.json({ events });
}
