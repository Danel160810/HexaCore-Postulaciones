import { z } from "zod";
import { isHttpsUrl, vimeoId, youtubeId } from "./media";
import { DEFAULT_MAX } from "./status";

const snowflake = z
  .string()
  .trim()
  .regex(/^\d{17,20}$/, "Debe ser un ID de Discord (17-20 dígitos)");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const questionInput = z
  .object({
    id: z.string().optional(),
    type: z.enum(["SHORT_TEXT", "LONG_TEXT", "TRUE_FALSE", "SINGLE_CHOICE"]),
    // Ampliado de 400 a 2000 caracteres para permitir preguntas largas
    title: z.string().trim().min(3, "La pregunta es demasiado corta").max(2000, "La pregunta no puede superar los 2000 caracteres"),
    // Ampliada la ayuda de 800 a 1500
    help: optionalText(1500),
    required: z.boolean().default(true),
    // Aumentado el límite superior de min/max a 10000 caracteres
    minLength: z.number().int().min(0).max(10000).nullish(),
    maxLength: z.number().int().min(1).max(10000).nullish(),
    options: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
    correct: z.string().trim().max(500).nullish(),
    mediaKind: z.enum(["NONE", "IMAGE", "YOUTUBE", "VIMEO"]).default("NONE"),
    mediaUrl: optionalText(500),
  })
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (q.type === "SINGLE_CHOICE") {
      if (q.options.length < 2) issue("options", "Añade al menos 2 opciones");
      if (new Set(q.options).size !== q.options.length) issue("options", "Hay opciones repetidas");
      if (q.correct && !q.options.includes(q.correct)) issue("correct", "La respuesta correcta debe ser una de las opciones");
    }
    if (q.type === "TRUE_FALSE" && q.correct && q.correct !== "true" && q.correct !== "false")
      issue("correct", "Debe ser verdadero o falso");
    if ((q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") && q.minLength && q.maxLength && q.minLength > q.maxLength)
      issue("minLength", "El mínimo no puede superar al máximo");

    if (q.mediaKind !== "NONE") {
      const url = q.mediaUrl ?? "";
      const ok =
        q.mediaKind === "IMAGE" ? isHttpsUrl(url) : q.mediaKind === "YOUTUBE" ? !!youtubeId(url) : !!vimeoId(url);
      if (!ok)
        issue(
          "mediaUrl",
          q.mediaKind === "IMAGE"
            ? "Pon un enlace https directo a la imagen"
            : `El enlace no es un vídeo válido de ${q.mediaKind === "YOUTUBE" ? "YouTube" : "Vimeo"}`
        );
    }
  })
  .transform((q) => ({
    ...q,
    // Limpiamos campos que no aplican al tipo
    options: q.type === "SINGLE_CHOICE" ? q.options : [],
    correct: q.type === "TRUE_FALSE" || q.type === "SINGLE_CHOICE" ? q.correct || null : null,
    minLength: q.type === "SHORT_TEXT" || q.type === "LONG_TEXT" ? q.minLength ?? null : null,
    maxLength: q.type === "SHORT_TEXT" || q.type === "LONG_TEXT" ? q.maxLength ?? DEFAULT_MAX[q.type] : null,
    mediaUrl: q.mediaKind === "NONE" ? null : q.mediaUrl,
  }));

export const formInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones")
    .max(60),
  title: z.string().trim().min(2).max(120),
  tag: z.string().trim().min(1).max(16),
  summary: z.string().trim().min(5, "Escribe una descripción corta").max(400),
  intro: optionalText(3000),
  refPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,4}$/, "De 2 a 4 letras, p. ej. ST"),
  isOpen: z.boolean(),
  closedNote: optionalText(400),
  cooldownDays: z.number().int().min(0).max(365),
  acceptedRoleId: snowflake.nullish().or(z.literal("").transform(() => null)),
  requiredRoleId: snowflake.nullish().or(z.literal("").transform(() => null)),
  position: z.number().int().min(0).max(999).default(0),
  questions: z.array(questionInput).min(1, "Añade al menos una pregunta").max(60),
});
export type FormInput = z.infer<typeof formInput>;

export const toggleInput = z.object({
  isOpen: z.boolean(),
  closedNote: optionalText(400),
});

export const statusInput = z
  .object({
    status: z.enum(["IN_REVIEW", "APPROVED", "REJECTED"]),
    note: optionalText(2500),
  })
  .superRefine((v, ctx) => {
    if (v.status === "REJECTED" && (!v.note || v.note.length < 10))
      ctx.addIssue({ code: "custom", path: ["note"], message: "Explica el motivo del rechazo (mínimo 10 caracteres)" });
  });

export const commentInput = z.object({ body: z.string().trim().min(1).max(3000) });

export const submitInput = z.object({
  formId: z.string().min(1),
  // Aumentado el límite de respuesta enviada por el usuario de 6000 a 12000
  answers: z.record(z.string(), z.string().max(12000)),
});

/** Convierte un ZodError en una respuesta legible para el cliente */
export function zodIssues(err: z.ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}
