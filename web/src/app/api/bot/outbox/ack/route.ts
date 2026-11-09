import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBot } from "@/lib/bot-auth";
import { readJson } from "@/lib/http";

const MAX_ATTEMPTS = 5;

const ackInput = z.object({
  results: z
    .array(
      z.object({
        id: z.string(),
        ok: z.boolean(),
        error: z.string().max(500).optional(),
        /** false si el usuario tiene los MD cerrados */
        dmDelivered: z.boolean().optional(),
      })
    )
    .max(50),
});

/** El bot confirma qué eventos ha procesado. */
export async function POST(req: Request) {
  const denied = checkBot(req);
  if (denied) return denied;

  const body = await readJson(req, ackInput);
  if ("error" in body) return body.error;

  for (const r of body.data.results) {
    const ev = await prisma.outboxEvent.findUnique({ where: { id: r.id } });
    if (!ev) continue;

    if (r.ok) {
      await prisma.outboxEvent.update({
        where: { id: r.id },
        data: { status: "DONE", processedAt: new Date(), lockedUntil: null, lastError: null },
      });
    } else {
      await prisma.outboxEvent.update({
        where: { id: r.id },
        data: {
          status: ev.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          lockedUntil: null,
          lastError: r.error ?? "Error desconocido",
        },
      });
    }

    const applicationId = (ev.payload as { applicationId?: string } | null)?.applicationId;
    if (applicationId && typeof r.dmDelivered === "boolean") {
      await prisma.application.updateMany({
        where: { id: applicationId },
        data: { dmFailed: !r.dmDelivered },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
