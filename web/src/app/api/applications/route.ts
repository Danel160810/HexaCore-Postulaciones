import { NextResponse, after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail, readJson } from "@/lib/http";
import { submitInput } from "@/lib/validation";
import { buildAnswers, eligibility, nextReference, userAppsFor } from "@/lib/applications";
import { enqueue, kickBot } from "@/lib/outbox";
import { SITE_URL } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/** Enviar una postulación */
export async function POST(req: Request) {
  const auth = await apiViewer();
  if (auth.error) return auth.error;
  const viewer = auth.viewer;
  const limited = await rateLimit(`postular:${viewer.id}`, 5, 600);
  if (limited) return limited;

  const body = await readJson(req, submitInput);
  if ("error" in body) return body.error;
  const { formId, answers: raw } = body.data;

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!form) return fail(404, "Este formulario ya no existe.");

  const check = eligibility(viewer, form, form.questions.length, await userAppsFor(viewer.id));
  if (!check.ok) return fail(409, check.message, { reason: check.reason });

  const { errors, answers, score, maxScore } = buildAnswers(form.questions, raw);
  if (errors.length) return fail(422, "Hay respuestas que revisar.", { questionErrors: errors });

  const reference = await nextReference(form.refPrefix);

  const app = await prisma.$transaction(async (tx) => {
    // Re-comprobación dentro de la transacción: evita dos envíos simultáneos
    const active = await tx.application.findFirst({
      where: { userId: viewer.id, status: { in: ["PENDING", "IN_REVIEW"] } },
      select: { id: true },
    });
    if (active) return null;

    const created = await tx.application.create({
      data: {
        reference,
        userId: viewer.id,
        formId: form.id,
        answers: answers as unknown as Prisma.InputJsonValue,
        score,
        maxScore,
        events: { create: { status: "PENDING", actorId: viewer.id } },
      },
    });
    await enqueue(tx, "APPLICATION_SUBMITTED", {
      applicationId: created.id,
      reference: created.reference,
      userId: viewer.id,
      username: viewer.username,
      form: { title: form.title, tag: form.tag },
      url: `${SITE_URL}/postulaciones/${created.id}`,
      adminUrl: `${SITE_URL}/admin/postulaciones/${created.id}`,
      at: created.createdAt.toISOString(),
    });
    return created;
  });

  if (!app) return fail(409, "Ya tienes una postulación en curso.");

  after(kickBot);
  return NextResponse.json({ id: app.id, reference: app.reference }, { status: 201 });
}
