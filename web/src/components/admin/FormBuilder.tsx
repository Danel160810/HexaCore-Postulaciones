"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleDot,
  Copy,
  Film,
  GripVertical,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  ToggleLeft,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { MediaEmbed } from "../MediaEmbed";
import { QTYPE_LABEL, DEFAULT_MAX, type QType } from "@/lib/status";
import type { MediaKind } from "@/lib/media";

export type BuilderQuestion = {
  key: string;
  type: QType;
  title: string;
  help: string;
  required: boolean;
  minLength: string;
  maxLength: string;
  options: string[];
  correct: string;
  mediaKind: MediaKind;
  mediaUrl: string;
};

export type BuilderForm = {
  id?: string;
  slug: string;
  title: string;
  tag: string;
  summary: string;
  intro: string;
  refPrefix: string;
  isOpen: boolean;
  closedNote: string;
  cooldownDays: string;
  acceptedRoleId: string;
  requiredRoleId: string;
  position: string;
  archived?: boolean;
  questions: BuilderQuestion[];
};

const TYPE_ICON: Record<QType, typeof Type> = {
  SHORT_TEXT: Type,
  LONG_TEXT: AlignLeft,
  TRUE_FALSE: ToggleLeft,
  SINGLE_CHOICE: CircleDot,
};

const MEDIA: { value: MediaKind; label: string }[] = [
  { value: "NONE", label: "Sin medio" },
  { value: "IMAGE", label: "Imagen" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "VIMEO", label: "Vimeo" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

export function blankQuestion(type: QType = "LONG_TEXT"): BuilderQuestion {
  return {
    key: uid(),
    type,
    title: "",
    help: "",
    required: true,
    minLength: "",
    maxLength: "",
    options: type === "SINGLE_CHOICE" ? ["", ""] : [],
    correct: "",
    mediaKind: "NONE",
    mediaUrl: "",
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

type Issue = { path: string; message: string };

export function FormBuilder({ initial }: { initial: BuilderForm }) {
  const router = useRouter();
  const [form, setForm] = useState<BuilderForm>(() =>
    initial.questions.length ? initial : { ...initial, questions: [blankQuestion("SHORT_TEXT")] }
  );
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [expanded, setExpanded] = useState<string | null>(() => (initial.id ? null : form.questions[0]?.key ?? null));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const err = (path: string) => issues.find((i) => i.path === path)?.message;
  const qErrors = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const i of issues) {
      const m = i.path.match(/^questions\.(\d+)(?:\.|$)/);
      if (m) map.set(Number(m[1]), [...(map.get(Number(m[1])) ?? []), i.message]);
    }
    return map;
  }, [issues]);

  function patch(p: Partial<BuilderForm>) {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
    setMessage(null);
  }
  function patchQ(key: string, p: Partial<BuilderQuestion>) {
    setForm((f) => ({ ...f, questions: f.questions.map((q) => (q.key === key ? { ...q, ...p } : q)) }));
    setDirty(true);
    setMessage(null);
  }
  function addQ(type: QType) {
    const q = blankQuestion(type);
    patch({ questions: [...form.questions, q] });
    setExpanded(q.key);
  }
  function removeQ(key: string) {
    patch({ questions: form.questions.filter((q) => q.key !== key) });
  }
  function duplicateQ(key: string) {
    const i = form.questions.findIndex((q) => q.key === key);
    const copy = { ...form.questions[i], key: uid(), options: [...form.questions[i].options] };
    const list = [...form.questions];
    list.splice(i + 1, 0, copy);
    patch({ questions: list });
    setExpanded(copy.key);
  }
  function moveQ(key: string, delta: number) {
    const i = form.questions.findIndex((q) => q.key === key);
    const j = i + delta;
    if (j < 0 || j >= form.questions.length) return;
    const list = [...form.questions];
    [list[i], list[j]] = [list[j], list[i]];
    patch({ questions: list });
  }

  function payload() {
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    return {
      slug: form.slug,
      title: form.title,
      tag: form.tag,
      summary: form.summary,
      intro: form.intro || null,
      refPrefix: form.refPrefix,
      isOpen: form.isOpen,
      closedNote: form.closedNote || null,
      cooldownDays: Number(form.cooldownDays) || 0,
      acceptedRoleId: form.acceptedRoleId.trim() || null,
      requiredRoleId: form.requiredRoleId.trim() || null,
      position: Number(form.position) || 0,
      questions: form.questions.map((q) => ({
        type: q.type,
        title: q.title,
        help: q.help || null,
        required: q.required,
        minLength: num(q.minLength),
        maxLength: num(q.maxLength),
        options: q.options.map((o) => o.trim()).filter(Boolean),
        correct: q.correct || null,
        mediaKind: q.mediaKind,
        mediaUrl: q.mediaKind === "NONE" ? null : q.mediaUrl || null,
      })),
    };
  }

  async function save() {
    setSaving(true);
    setIssues([]);
    setMessage(null);
    const res = await fetch(form.id ? `/api/admin/forms/${form.id}` : "/api/admin/forms", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      const list: Issue[] = data.issues ?? [];
      setIssues(list);
      setMessage({ tone: "error", text: data.error ?? "No se pudo guardar." });
      const firstQ = list.map((i) => i.path.match(/^questions\.(\d+)/)).find(Boolean);
      if (firstQ) setExpanded(form.questions[Number(firstQ[1])]?.key ?? null);
      return;
    }
    setDirty(false);
    setMessage({ tone: "ok", text: "Formulario guardado." });
    if (!form.id && data.form?.id) router.replace(`/admin/formularios/${data.form.id}`);
    else router.refresh();
  }

  async function remove() {
    if (!form.id) return;
    if (!confirm("¿Borrar este formulario? Si ya tiene postulaciones se archivará para conservar el historial.")) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/forms/${form.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ tone: "error", text: data.error ?? "No se pudo borrar." });
      return;
    }
    router.push("/admin/formularios");
    router.refresh();
  }

  return (
    <div className="w-full min-w-0 pb-28">
      <div className="grid gap-8 w-full min-w-0 lg:grid-cols-[360px_1fr]">
        {/* Ajustes del puesto */}
        <aside className="w-full min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="space-y-4 rounded-lg border border-seam bg-deepslate p-5">
            <h2 className="font-semibold">Ajustes del puesto</h2>
            <Field label="Nombre del puesto" error={err("title")}>
              <input
                className="field w-full min-w-0"
                value={form.title}
                placeholder="Developer"
                onChange={(e) => patch({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Etiqueta" error={err("tag")}>
                <input className="field w-full min-w-0" value={form.tag} placeholder="Dev" onChange={(e) => patch({ tag: e.target.value })} />
              </Field>
              <Field label="Prefijo ref." error={err("refPrefix")} hint={`#${form.refPrefix || "XX"}-2026-0001`}>
                <input
                  className="field w-full min-w-0 font-mono uppercase"
                  maxLength={4}
                  value={form.refPrefix}
                  placeholder="DV"
                  onChange={(e) => patch({ refPrefix: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
            <Field label="URL" error={err("slug")} hint={`/postular/${form.slug || "…"}`}>
              <input
                className="field w-full min-w-0 font-mono text-sm"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  patch({ slug: slugify(e.target.value) });
                }}
              />
            </Field>
            <Field label="Descripción corta" error={err("summary")} hint="Se muestra en la tarjeta del puesto.">
              <textarea className="field min-h-20 w-full min-w-0 text-sm resize-y" value={form.summary} onChange={(e) => patch({ summary: e.target.value })} />
            </Field>
            <Field label="Introducción (opcional)" error={err("intro")} hint="Se muestra antes de empezar el examen.">
              <textarea className="field min-h-24 w-full min-w-0 text-sm resize-y" value={form.intro} onChange={(e) => patch({ intro: e.target.value })} />
            </Field>
          </section>

          <section className="space-y-4 rounded-lg border border-seam bg-deepslate p-5">
            <h2 className="font-semibold">Reglas</h2>
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium">Aceptando postulaciones</span>
                <span className="text-xs text-fog">Ciérralo cuando quieras pausar el puesto.</span>
              </span>
              <input
                type="checkbox"
                className="size-5 accent-[var(--color-acento)]"
                checked={form.isOpen}
                onChange={(e) => patch({ isOpen: e.target.checked })}
              />
            </label>
            {!form.isOpen && (
              <Field label="Mensaje mientras está cerrada" error={err("closedNote")}>
                <input
                  className="field w-full min-w-0 text-sm"
                  value={form.closedNote}
                  placeholder="Esta categoría no acepta postulaciones ahora mismo."
                  onChange={(e) => patch({ closedNote: e.target.value })}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Espera tras rechazo" error={err("cooldownDays")} hint="En días. 0 = sin espera.">
                <input
                  type="number"
                  min={0}
                  max={365}
                  className="field w-full min-w-0"
                  value={form.cooldownDays}
                  onChange={(e) => patch({ cooldownDays: e.target.value })}
                />
              </Field>
              <Field label="Orden" error={err("position")} hint="Menor aparece antes.">
                <input type="number" min={0} className="field w-full min-w-0" value={form.position} onChange={(e) => patch({ position: e.target.value })} />
              </Field>
            </div>
            <Field label="Rol al aprobar (ID)" error={err("acceptedRoleId")} hint="El bot se lo da al aprobar. Vacío = ninguno.">
              <input
                className="field w-full min-w-0 font-mono text-sm"
                inputMode="numeric"
                value={form.acceptedRoleId}
                onChange={(e) => patch({ acceptedRoleId: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field label="Rol necesario para postular (ID)" error={err("requiredRoleId")} hint="Opcional. Ej.: rol de nivel 10.">
              <input
                className="field w-full min-w-0 font-mono text-sm"
                inputMode="numeric"
                value={form.requiredRoleId}
                onChange={(e) => patch({ requiredRoleId: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </section>

          {form.id && (
            <button className="btn-danger w-full" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Borrar formulario
            </button>
          )}
        </aside>

        {/* Preguntas */}
        <section className="w-full min-w-0">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Preguntas</h2>
              <p className="text-sm text-fog">Arrastra desde el asa para reordenar. Las postulaciones ya enviadas no cambian.</p>
            </div>
            <span className="text-sm text-fog tabular-nums">{form.questions.length}</span>
          </div>
          {err("questions") && <p className="mt-3 text-sm text-ember">{err("questions")}</p>}

          <Reorder.Group
            axis="y"
            values={form.questions}
            onReorder={(list) => patch({ questions: list })}
            className="mt-5 space-y-3 w-full min-w-0"
          >
            {form.questions.map((q, i) => (
              <QuestionEditor
                key={q.key}
                q={q}
                index={i}
                total={form.questions.length}
                open={expanded === q.key}
                errors={qErrors.get(i) ?? []}
                fieldError={(f) => err(`questions.${i}.${f}`)}
                onToggle={() => setExpanded(expanded === q.key ? null : q.key)}
                onChange={(p) => patchQ(q.key, p)}
                onRemove={() => removeQ(q.key)}
                onDuplicate={() => duplicateQ(q.key)}
                onMove={(d) => moveQ(q.key, d)}
              />
            ))}
          </Reorder.Group>

          <div className="mt-4 rounded-lg border border-dashed border-seam p-4 w-full min-w-0">
            <p className="mb-3 text-sm text-fog">Añadir pregunta</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(QTYPE_LABEL) as QType[]).map((t) => {
                const Icon = TYPE_ICON[t];
                return (
                  <button key={t} className="btn-ghost justify-start" onClick={() => addQ(t)}>
                    <Plus className="size-3.5 text-acento shrink-0" />
                    <Icon className="size-4 shrink-0" /> <span className="truncate">{QTYPE_LABEL[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Barra de guardado */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-seam bg-bedrock/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 text-sm">
            <AnimatePresence mode="wait">
              {message ? (
                <motion.p
                  key={message.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={message.tone === "ok" ? "text-acento break-words" : "text-ember break-words"}
                >
                  {message.text}
                </motion.p>
              ) : (
                <motion.p key="state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-fog">
                  {dirty ? "Tienes cambios sin guardar." : form.id ? "Todo guardado." : "Formulario nuevo."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/admin/formularios" className="btn-ghost">
              Volver
            </Link>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {form.id ? "Guardar cambios" : "Crear formulario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="w-full min-w-0">
      <label className="label">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-ember break-words">{error}</p> : hint ? <p className="hint break-words">{hint}</p> : null}
    </div>
  );
}

function QuestionEditor({
  q,
  index,
  total,
  open,
  errors,
  fieldError,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: {
  q: BuilderQuestion;
  index: number;
  total: number;
  open: boolean;
  errors: string[];
  fieldError: (f: string) => string | undefined;
  onToggle: () => void;
  onChange: (p: Partial<BuilderQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
}) {
  const controls = useDragControls();
  const Icon = TYPE_ICON[q.type];
  const hasErr = errors.length > 0;

  return (
    <Reorder.Item
      value={q}
      dragListener={false}
      dragControls={controls}
      className={`rounded-lg border bg-deepslate w-full min-w-0 overflow-hidden ${hasErr ? "border-ember/50" : open ? "border-acento/40" : "border-seam"}`}
      whileDrag={{ scale: 1.015, boxShadow: "0 20px 40px -12px rgba(0,0,0,.6)" }}
    >
      <div className="flex items-center gap-2 px-3 py-3 w-full min-w-0">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-fog hover:text-bone active:cursor-grabbing shrink-0"
          onPointerDown={(e) => controls.start(e)}
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="w-6 font-mono text-sm text-fog shrink-0">{index + 1}</span>
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2.5 text-left overflow-hidden" aria-expanded={open}>
          <Icon className="size-4 shrink-0 text-acento" />
          <span className={`min-w-0 flex-1 break-words text-wrap ${open ? "whitespace-normal" : "line-clamp-2"} ${q.title ? "" : "text-fog italic"}`}>
            {q.title || "Pregunta sin título"}
          </span>
          {q.mediaKind !== "NONE" && (q.mediaKind === "IMAGE" ? <ImageIcon className="size-3.5 shrink-0 text-fog" /> : <Film className="size-3.5 shrink-0 text-fog" />)}
          {!q.required && <span className="shrink-0 text-xs text-fog">opcional</span>}
          {hasErr && <span className="shrink-0 text-xs text-ember">revisar</span>}
          <ChevronDown className={`ml-auto size-4 shrink-0 text-fog transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="flex shrink-0 items-center">
          <IconBtn label="Subir" onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUp className="size-3.5" />
          </IconBtn>
          <IconBtn label="Bajar" onClick={() => onMove(1)} disabled={index === total - 1}>
            <ArrowDown className="size-3.5" />
          </IconBtn>
          <IconBtn label="Duplicar" onClick={onDuplicate}>
            <Copy className="size-3.5" />
          </IconBtn>
          <IconBtn label="Eliminar" onClick={onRemove} danger>
            <Trash2 className="size-3.5" />
          </IconBtn>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full min-w-0"
          >
            <div className="space-y-4 border-t border-seam px-4 py-5 sm:px-5 w-full min-w-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Tipo de pregunta">
                {(Object.keys(QTYPE_LABEL) as QType[]).map((t) => {
                  const TIcon = TYPE_ICON[t];
                  const sel = q.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() =>
                        onChange({
                          type: t,
                          correct: "",
                          options: t === "SINGLE_CHOICE" && q.options.length < 2 ? ["", ""] : q.options,
                        })
                      }
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors min-w-0 ${
                        sel ? "border-acento bg-acento/10 text-bone" : "border-seam text-fog hover:text-bone"
                      }`}
                    >
                      <TIcon className="size-4 shrink-0" /> <span className="truncate">{QTYPE_LABEL[t]}</span>
                    </button>
                  );
                })}
              </div>

              <Field label="Pregunta" error={fieldError("title")}>
                <textarea
                  rows={2}
                  className="field min-h-16 w-full min-w-0 resize-y break-words whitespace-pre-wrap"
                  value={q.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="Escribe el enunciado de la pregunta..."
                />
              </Field>
              <Field label="Ayuda (opcional)" error={fieldError("help")} hint="Texto pequeño bajo la pregunta.">
                <input className="field w-full min-w-0 text-sm" value={q.help} onChange={(e) => onChange({ help: e.target.value })} />
              </Field>

              {(q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mínimo de caracteres" error={fieldError("minLength")}>
                    <input
                      type="number"
                      min={0}
                      className="field w-full min-w-0"
                      value={q.minLength}
                      placeholder="0"
                      onChange={(e) => onChange({ minLength: e.target.value })}
                    />
                  </Field>
                  <Field label="Máximo de caracteres" error={fieldError("maxLength")}>
                    <input
                      type="number"
                      min={1}
                      className="field w-full min-w-0"
                      value={q.maxLength}
                      placeholder={String(DEFAULT_MAX[q.type])}
                      onChange={(e) => onChange({ maxLength: e.target.value })}
                    />
                  </Field>
                </div>
              )}

              {q.type === "TRUE_FALSE" && (
                <Field label="Respuesta correcta" error={fieldError("correct")} hint="Si la marcas, la web corrige sola y muestra los aciertos al staff.">
                  <select className="field w-full min-w-0" value={q.correct} onChange={(e) => onChange({ correct: e.target.value })}>
                    <option value="">Sin corrección automática</option>
                    <option value="true">Verdadero</option>
                    <option value="false">Falso</option>
                  </select>
                </Field>
              )}

              {q.type === "SINGLE_CHOICE" && (
                <div className="w-full min-w-0 space-y-2">
                  <p className="label">Opciones</p>
                  <div className="space-y-2 w-full min-w-0">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2 w-full min-w-0">
                        <button
                          type="button"
                          title="Marcar como correcta"
                          aria-label={`Marcar opción ${oi + 1} como correcta`}
                          aria-pressed={!!o && q.correct === o}
                          onClick={() => onChange({ correct: q.correct === o ? "" : o })}
                          className={`hex size-6 shrink-0 transition-colors ${o && q.correct === o ? "bg-acento" : "bg-seam hover:bg-fog/50"}`}
                        />
                        <input
                          className="field w-full min-w-0 py-2 text-sm"
                          value={o}
                          placeholder={`Opción ${oi + 1}`}
                          onChange={(e) => {
                            const options = [...q.options];
                            const wasCorrect = q.correct === options[oi];
                            options[oi] = e.target.value;
                            onChange({ options, ...(wasCorrect ? { correct: e.target.value } : {}) });
                          }}
                        />
                        <IconBtn
                          label="Quitar opción"
                          onClick={() => onChange({ options: q.options.filter((_, k) => k !== oi), ...(q.correct === o ? { correct: "" } : {}) })}
                          disabled={q.options.length <= 2}
                        >
                          <X className="size-3.5" />
                        </IconBtn>
                      </div>
                    ))}
                  </div>
                  {q.options.length < 10 && (
                    <button type="button" className="mt-2 text-sm text-acento hover:underline" onClick={() => onChange({ options: [...q.options, ""] })}>
                      Añadir opción
                    </button>
                  )}
                  <p className="hint">Pulsa el hexágono de una opción para marcarla como correcta (opcional).</p>
                  {(fieldError("options") || fieldError("correct")) && (
                    <p className="mt-1 text-xs text-ember break-words">{fieldError("options") || fieldError("correct")}</p>
                  )}
                </div>
              )}

              <div className="rounded-md border border-seam bg-slab/40 p-4 w-full min-w-0">
                <p className="label">Imagen o vídeo en la pregunta</p>
                <div className="flex flex-wrap gap-2">
                  {MEDIA.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => onChange({ mediaKind: m.value })}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        q.mediaKind === m.value ? "border-acento bg-acento/10" : "border-seam text-fog hover:text-bone"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {q.mediaKind !== "NONE" && (
                  <div className="mt-3 space-y-3 w-full min-w-0">
                    <Field
                      label="Enlace"
                      error={fieldError("mediaUrl")}
                      hint={
                        q.mediaKind === "IMAGE"
                          ? "Enlace https directo a la imagen (por ejemplo, de i.imgur.com)."
                          : q.mediaKind === "YOUTUBE"
                            ? "Vale cualquier enlace de YouTube: normal, youtu.be o shorts."
                            : "Enlace del vídeo, p. ej. https://vimeo.com/123456789"
                      }
                    >
                      <input
                        className="field w-full min-w-0 text-sm"
                        value={q.mediaUrl}
                        placeholder="https://"
                        onChange={(e) => onChange({ mediaUrl: e.target.value.trim() })}
                      />
                    </Field>
                    <MediaEmbed kind={q.mediaKind} url={q.mediaUrl} className="max-w-md w-full" />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-acento)]"
                  checked={q.required}
                  onChange={(e) => onChange({ required: e.target.checked })}
                />
                Obligatoria
              </label>

              {errors.length > 0 && (
                <ul className="rounded-md border border-ember/40 bg-ember/10 p-3 text-sm text-ember break-words">
                  {[...new Set(errors)].map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1.5 text-fog transition-colors disabled:opacity-30 ${danger ? "hover:text-ember" : "hover:text-bone"}`}
    >
      {children}
    </button>
  );
}
