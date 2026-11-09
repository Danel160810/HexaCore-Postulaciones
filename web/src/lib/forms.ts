import type { Prisma } from "@prisma/client";
import type { FormInput } from "./validation";

/** Datos del formulario (sin preguntas) listos para Prisma */
export function formData(input: FormInput) {
  const { questions: _q, ...meta } = input;
  return {
    ...meta,
    acceptedRoleId: meta.acceptedRoleId ?? null,
    requiredRoleId: meta.requiredRoleId ?? null,
  };
}

export function questionData(q: FormInput["questions"][number], position: number) {
  return {
    position,
    type: q.type,
    title: q.title,
    help: q.help,
    required: q.required,
    minLength: q.minLength,
    maxLength: q.maxLength,
    options: q.options,
    correct: q.correct,
    mediaKind: q.mediaKind,
    mediaUrl: q.mediaUrl,
  } satisfies Omit<Prisma.QuestionUncheckedCreateInput, "formId">;
}

export function isUniqueError(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}
