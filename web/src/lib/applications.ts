import type { Form, Question } from "@prisma/client";
import { prisma } from "./prisma";
import type { Viewer } from "./rbac";
import { DEFAULT_MAX, type AnswerSnapshot } from "./status";
import { fmtDateTime } from "./format";
import { MARCA } from "@/config/marca";

export type Eligibility =
  | { ok: true }
  | {
      ok: false;
      reason: "closed" | "active" | "cooldown" | "not-member" | "role" | "empty";
      message: string;
      until?: Date;
      activeId?: string;
    };

type UserApp = { id: string; formId: string; status: string; cooldownUntil: Date | null; reference: string };

/** ¿Puede este usuario empezar una postulación a este formulario ahora mismo? */
export function eligibility(
  viewer: Viewer,
  form: Pick<Form, "id" | "isOpen" | "closedNote" | "requiredRoleId" | "archived">,
  questionCount: number,
  userApps: UserApp[]
): Eligibility {
  if (!form.isOpen || form.archived)
    return { ok: false, reason: "closed", message: form.closedNote || "Esta categoría no acepta postulaciones ahora mismo." };
  if (questionCount === 0)
    return { ok: false, reason: "empty", message: "Este formulario todavía no tiene preguntas." };
  if (!viewer.isMember)
    return {
      ok: false,
      reason: "not-member",
      message: viewer.inGuild
        ? "Necesitas el rol Miembro en el Discord para postular. Verifícate y vuelve a entrar."
        : `Tienes que estar en el Discord de ${MARCA.nombre} para postular.`,
    };
  if (form.requiredRoleId && !viewer.roles.includes(form.requiredRoleId))
    return { ok: false, reason: "role", message: "Esta categoría pide un rol de Discord que todavía no tienes." };

  const active = userApps.find((a) => a.status === "PENDING" || a.status === "IN_REVIEW");
  if (active)
    return {
      ok: false,
      reason: "active",
      activeId: active.id,
      message: `Ya tienes una postulación en curso (#${active.reference}). Solo puedes tener una a la vez.`,
    };

  const now = Date.now();
  const cooldown = userApps
    .filter((a) => a.formId === form.id && a.cooldownUntil && a.cooldownUntil.getTime() > now)
    .sort((a, b) => b.cooldownUntil!.getTime() - a.cooldownUntil!.getTime())[0];
  if (cooldown)
    return {
      ok: false,
      reason: "cooldown",
      until: cooldown.cooldownUntil!,
      message: `Podrás volver a postular el ${fmtDateTime(cooldown.cooldownUntil!)} (hora de España).`,
    };

  return { ok: true };
}

export function userAppsFor(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    select: { id: true, formId: true, status: true, cooldownUntil: true, reference: true },
  });
}

/** Valida las respuestas contra las preguntas y genera la copia + puntuación. */
export function buildAnswers(questions: Question[], raw: Record<string, string>) {
  const errors: { questionId: string; message: string }[] = [];
  const answers: AnswerSnapshot[] = [];
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    const value = (raw[q.id] ?? "").trim();
    const err = (message: string) => errors.push({ questionId: q.id, message });

    if (!value) {
      if (q.required) err("Esta pregunta es obligatoria.");
    } else if (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") {
      const max = q.maxLength ?? DEFAULT_MAX[q.type];
      if (value.length > max) err(`Máximo ${max} caracteres.`);
      if (q.minLength && value.length < q.minLength) err(`Mínimo ${q.minLength} caracteres.`);
    } else if (q.type === "TRUE_FALSE") {
      if (value !== "true" && value !== "false") err("Elige verdadero o falso.");
    } else if (q.type === "SINGLE_CHOICE") {
      if (!q.options.includes(value)) err("Elige una de las opciones.");
    }

    let isCorrect: boolean | null = null;
    if (q.correct && (q.type === "TRUE_FALSE" || q.type === "SINGLE_CHOICE")) {
      maxScore++;
      isCorrect = value === q.correct;
      if (isCorrect) score++;
    }

    answers.push({
      questionId: q.id,
      type: q.type,
      title: q.title,
      help: q.help,
      options: q.options,
      mediaKind: q.mediaKind,
      mediaUrl: q.mediaUrl,
      value,
      correct: q.correct,
      isCorrect,
    });
  }

  return { errors, answers, score: maxScore ? score : null, maxScore: maxScore || null };
}

/** Siguiente referencia del tipo ST-2026-0007 (contador atómico por prefijo y año). */
export async function nextReference(prefix: string) {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return `${key}-${String(rows[0].value).padStart(4, "0")}`;
}
