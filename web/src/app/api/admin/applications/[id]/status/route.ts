import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail, readJson } from "@/lib/http";
import { statusInput } from "@/lib/validation";
import { enqueue, kickBot } from "@/lib/outbox";
import { SITE_URL } from "@/lib/env";

/**
 * Cambiar el estado de una postulación (Reviewer o Admin).
 * - Reviewer: PENDING/IN_REVIEW → IN_REVIEW, APPROVED, REJECTED
 * - Admin: además puede reabrir una ya resuelta (→ IN_REVIEW) o corregir la decisión.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiViewer("reviewer");
  if (auth.error) return auth.error;
  const viewer = auth.viewer;
  const { id } = await params;

  const body = await readJson(req, statusInput);
  if ("error" in body) return body.error;
  const { status, note } = body.data;

  const app = await prisma.application.findUnique({
    where: { id },
    include: { form: true, user: { select: { username: true } } },
  });
  if (!app) return fail(404, "Esta postulación no existe.");
  if (app.status === "WITHDRAWN") return fail(409, "El postulante retiró esta postulación.");
  if (app.status === status) return fail(409, "La postulación ya está en ese estado.");

  const isFinal = app.status === "APPROVED" || app.status === "REJECTED";
  if (isFinal && !viewer.isAdmin)
    return fail(403, "Esta postulación ya está resuelta. Solo un Admin puede reabrirla o cambiar la decisión.");

  const now = new Date();
  const final = status === "APPROVED" || status === "REJECTED";
  const cooldownUntil =
    status === "REJECTED" && app.form.cooldownDays > 0
      ? new Date(now.getTime() + app.form.cooldownDays * 86_400_000)
      : null;

  const updated = await prisma.$transaction(async (tx) => {
    // Bloqueo optimista: si otro revisor cambió el estado a la vez, no pisamos su decisión
    const res = await tx.application.updateMany({
      where: { id, status: app.status },
      data: {
        status,
        decisionNote: final ? note : null,
        reviewerId: final ? viewer.id : null,
        decidedAt: final ? now : null,
        cooldownUntil,
        dmFailed: false,
      },
    });
    if (res.count === 0) return false;

    await tx.applicationEvent.create({
      data: { applicationId: id, status, actorId: viewer.id, note: final ? note : null },
    });
    await enqueue(tx, "STATUS_CHANGED", {
      applicationId: id,
      reference: app.reference,
      userId: app.userId,
      username: app.user.username,
      form: { title: app.form.title, tag: app.form.tag },
      status,
      previousStatus: app.status,
      note: final ? note : null,
      reviewer: { id: viewer.id, username: viewer.username },
      cooldownUntil: cooldownUntil?.toISOString() ?? null,
      acceptedRoleId: status === "APPROVED" ? app.form.acceptedRoleId : null,
      url: `${SITE_URL}/postulaciones/${id}`,
      adminUrl: `${SITE_URL}/admin/postulaciones/${id}`,
      at: now.toISOString(),
    });
    return true;
  });

  if (!updated) return fail(409, "Otro miembro del staff acaba de cambiar esta postulación. Recarga para ver el estado actual.");

  after(kickBot);
  return NextResponse.json({ ok: true, status });
}
