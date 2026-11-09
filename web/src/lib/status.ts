// Estados y su presentación (seguro para cliente: no importa Prisma).
export type AppStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
export type QType = "SHORT_TEXT" | "LONG_TEXT" | "TRUE_FALSE" | "SINGLE_CHOICE";

export const STATUS: Record<
  AppStatus,
  { label: string; tone: "amber" | "sky" | "acento" | "ember" | "fog"; timeline: string }
> = {
  PENDING: { label: "Recibida", tone: "amber", timeline: "Entró en la cola de revisión." },
  IN_REVIEW: { label: "En revisión", tone: "sky", timeline: "El equipo la está valorando." },
  APPROVED: { label: "Aprobada", tone: "acento", timeline: "¡Bienvenido al equipo!" },
  REJECTED: { label: "Rechazada", tone: "ember", timeline: "Puedes leer el motivo en esta página." },
  WITHDRAWN: { label: "Retirada", tone: "fog", timeline: "La retiraste tú antes de la revisión." },
};

export const ACTIVE_STATUSES: AppStatus[] = ["PENDING", "IN_REVIEW"];
export const FINAL_STATUSES: AppStatus[] = ["APPROVED", "REJECTED", "WITHDRAWN"];

export const QTYPE_LABEL: Record<QType, string> = {
  SHORT_TEXT: "Texto corto",
  LONG_TEXT: "Texto largo",
  TRUE_FALSE: "Verdadero / Falso",
  SINGLE_CHOICE: "Opción única",
};

// Se han aumentado los valores predeterminados para evitar recortes prematuros
export const DEFAULT_MAX: Record<"SHORT_TEXT" | "LONG_TEXT", number> = {
  SHORT_TEXT: 300,
  LONG_TEXT: 4000,
};

/** Clases de Tailwind por tono */
export const TONE: Record<string, { text: string; bg: string; ring: string; dot: string }> = {
  amber: { text: "text-amber", bg: "bg-amber/10", ring: "ring-amber/30", dot: "bg-amber" },
  sky: { text: "text-sky", bg: "bg-sky/10", ring: "ring-sky/30", dot: "bg-sky" },
  acento: { text: "text-acento", bg: "bg-acento/10", ring: "ring-acento/30", dot: "bg-acento" },
  ember: { text: "text-ember", bg: "bg-ember/10", ring: "ring-ember/30", dot: "bg-ember" },
  fog: { text: "text-fog", bg: "bg-fog/10", ring: "ring-fog/25", dot: "bg-fog" },
};

/** Respuesta guardada (copia de la pregunta + valor) */
export type AnswerSnapshot = {
  questionId: string;
  type: QType;
  title: string;
  help?: string | null;
  options?: string[];
  mediaKind?: string;
  mediaUrl?: string | null;
  value: string;
  correct?: string | null;
  isCorrect?: boolean | null;
};

export function displayAnswer(a: Pick<AnswerSnapshot, "type" | "value">) {
  if (a.type === "TRUE_FALSE") return a.value === "true" ? "Verdadero" : a.value === "false" ? "Falso" : "—";
  return a.value?.trim() ? a.value : "—";
}
