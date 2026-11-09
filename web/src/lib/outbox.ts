import type { Prisma } from "@prisma/client";

/**
 * Eventos que la web deja para el bot. El bot los recoge con
 * GET /api/bot/outbox y confirma con POST /api/bot/outbox/ack.
 */
export type OutboxPayloads = {
  APPLICATION_SUBMITTED: {
    applicationId: string;
    reference: string;
    userId: string;
    username: string;
    form: { title: string; tag: string };
    url: string;
    adminUrl: string;
    at: string;
  };
  STATUS_CHANGED: {
    applicationId: string;
    reference: string;
    userId: string;
    username: string;
    form: { title: string; tag: string };
    status: "IN_REVIEW" | "APPROVED" | "REJECTED";
    previousStatus: string;
    note: string | null;
    reviewer: { id: string; username: string };
    cooldownUntil: string | null;
    acceptedRoleId: string | null;
    url: string;
    adminUrl: string;
    at: string;
  };
};

// PrismaClient también encaja en TransactionClient, así que sirve dentro y fuera de transacciones
type Tx = Prisma.TransactionClient;

export async function enqueue<K extends keyof OutboxPayloads>(tx: Tx, type: K, payload: OutboxPayloads[K]) {
  await tx.outboxEvent.create({ data: { type, payload: payload as unknown as Prisma.InputJsonValue } });
}

/**
 * Si el bot expone HTTP (BOT_WEBHOOK_URL), le avisamos para que recoja ya
 * los eventos sin esperar a su siguiente sondeo. Si falla no pasa nada:
 * el bot los recogerá en el siguiente ciclo.
 */
export async function kickBot() {
  const url = process.env.BOT_WEBHOOK_URL;
  const secret = process.env.BOT_API_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* el sondeo normal lo cubrirá */
  }
}
