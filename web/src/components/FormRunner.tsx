"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil, Send } from "lucide-react";
import { MediaEmbed } from "./MediaEmbed";
import { DEFAULT_MAX, displayAnswer, type QType } from "@/lib/status";
import { MARCA } from "@/config/marca";

export type RunnerQuestion = {
  id: string;
  type: QType;
  title: string;
  help: string | null;
  required: boolean;
  minLength: number | null;
  maxLength: number | null;
  options: string[];
  mediaKind: string;
  mediaUrl: string | null;
};

type Props = {
  form: { id: string; title: string; tag: string; intro: string | null; version: number };
  questions: RunnerQuestion[];
  preview?: boolean;
};

const INTRO = -1;

function maxFor(q: RunnerQuestion) {
  return q.type === "SHORT_TEXT" || q.type === "LONG_TEXT" ? (q.maxLength ?? DEFAULT_MAX[q.type]) : null;
}

function validate(q: RunnerQuestion, raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return q.required ? "Esta pregunta es obligatoria." : null;
  const max = maxFor(q);
  if (max && v.length > max) return `Te pasas por ${v.length - max} caracteres (máximo ${max}).`;
  if (q.minLength && v.length < q.minLength) return `Escribe al menos ${q.minLength} caracteres (llevas ${v.length}).`;
  return null;
}

export function FormRunner({ form, questions, preview = false }: Props) {
  const n = questions.length;
  const REVIEW = n;
  const DONE = n + 1;
  const draftKey = `postulacion:draft:${form.id}:${form.version}`;

  const [step, setStep] = useState(INTRO);
  const [dir, setDir] = useState(1);
  const [furthest, setFurthest] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [fromReview, setFromReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; reference: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Recuperar borrador
  useEffect(() => {
    if (preview) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        if (Object.values(parsed).some((v) => v?.trim())) {
          setAnswers(parsed);
          setRestored(true);
        }
      }
    } catch {}
  }, [draftKey, preview]);

  // Guardar borrador
  useEffect(() => {
    if (preview || result) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {}
  }, [answers, draftKey, preview, result]);

  // Foco automático en el campo de texto
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, [step]);

  const go = useCallback(
    (to: number) => {
      setDir(to > step ? 1 : -1);
      setError(null);
      setStep(to);
      if (to < n) setFurthest((f) => Math.max(f, to));
    },
    [n, step]
  );

  const next = useCallback(() => {
    if (step >= 0 && step < n) {
      const err = validate(questions[step], answers[questions[step].id]);
      if (err) return setError(err);
      if (fromReview) {
        setFromReview(false);
        return go(REVIEW);
      }
    }
    go(step + 1);
  }, [step, n, questions, answers, fromReview, go, REVIEW]);

  const setAnswer = (id: string, value: string) => {
    setError(null);
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  // Atajos de teclado para V/F y opciones
  useEffect(() => {
    if (step < 0 || step >= n) return;
    const q = questions[step];
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (q.type === "TRUE_FALSE") {
        if (e.key.toLowerCase() === "v") setAnswer(q.id, "true");
        if (e.key.toLowerCase() === "f") setAnswer(q.id, "false");
      }
      if (q.type === "SINGLE_CHOICE") {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < q.options.length) setAnswer(q.id, q.options[i]);
      }
      if (e.key === "Enter" && target.tagName !== "BUTTON") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, n, questions, next]);

  async function submit() {
    if (preview) return;
    // Validación final de todo
    for (let i = 0; i < n; i++) {
      const err = validate(questions[i], answers[questions[i].id]);
      if (err) {
        setFromReview(true);
        go(i);
        setError(err);
        return;
      }
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const qErr = (data.questionErrors as { questionId: string; message: string }[] | undefined)?.[0];
        if (qErr) {
          const idx = questions.findIndex((q) => q.id === qErr.questionId);
          if (idx >= 0) {
            setFromReview(true);
            go(idx);
            setError(qErr.message);
            return;
          }
        }
        setServerError(data.error ?? "No pudimos enviar la postulación. Prueba otra vez.");
        return;
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setResult(data);
      go(DONE);
    } catch {
      setServerError("Sin conexión con el servidor. Tus respuestas siguen guardadas en este navegador.");
    } finally {
      setSubmitting(false);
    }
  }

  const q = step >= 0 && step < n ? questions[step] : null;
  const value = q ? (answers[q.id] ?? "") : "";
  const max = q ? maxFor(q) : null;
  const len = value.trim().length;

  return (
    <div className="mt-8">
      {/* Cabecera + progreso */}
      {step !== DONE && (
        <div className="mb-8">
          <p className="text-sm text-fog">{form.tag}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Postulación a {form.title}</h1>
          {step >= 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5" aria-label={`Pregunta ${Math.min(step + 1, n)} de ${n}`}>
              {questions.map((qq, i) => {
                const answered = !validate(qq, answers[qq.id]) && (answers[qq.id] ?? "").trim() !== "";
                const current = i === step;
                const reachable = i <= furthest || answered;
                return (
                  <button
                    key={qq.id}
                    type="button"
                    disabled={!reachable || step === DONE}
                    onClick={() => {
                      if (step === REVIEW) setFromReview(true);
                      go(i);
                    }}
                    title={`Pregunta ${i + 1}`}
                    className={`hex size-4 transition-all ${
                      current ? "scale-125 bg-acento" : answered ? "bg-acento/55 hover:bg-acento/80" : "bg-seam hover:bg-fog/40"
                    } disabled:cursor-default`}
                  />
                );
              })}
              <span className="ml-2 text-sm text-fog tabular-nums">
                {step >= n ? "Resumen" : `${step + 1} / ${n}`}
              </span>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -36 }}
          transition={{ duration: 0.22, ease: [0.2, 0.9, 0.25, 1] }}
        >
          {/* Intro */}
          {step === INTRO && (
            <section className="chamfer bg-seam p-px">
              <div className="chamfer bg-deepslate p-7 sm:p-9">
                {form.intro && <p className="max-w-[62ch] whitespace-pre-line text-bone/90">{form.intro}</p>}
                <ul className="mt-6 space-y-2 text-sm text-fog">
                  <li>{n} preguntas, una cada vez.</li>
                  <li>Tus respuestas se guardan en este navegador mientras escribes.</li>
                  <li>Antes de enviar verás un resumen para revisarlo todo.</li>
                </ul>
                {restored && (
                  <p className="mt-6 rounded-md border border-acento/30 bg-acento/10 px-4 py-2.5 text-sm text-acento">
                    Hemos recuperado el borrador que dejaste a medias.
                  </p>
                )}
                <button className="btn-primary mt-8 px-6 py-3" onClick={() => go(0)}>
                  {restored ? "Continuar" : "Empezar"} <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          )}

          {/* Pregunta */}
          {q && (
            <section>
              <h2 className="text-2xl leading-snug font-bold sm:text-[1.75rem]">
                {q.title}
                {!q.required && <span className="ml-2 align-middle text-sm font-normal text-fog">(opcional)</span>}
              </h2>
              {q.help && <p className="mt-2 max-w-[65ch] whitespace-pre-line text-fog">{q.help}</p>}
              <MediaEmbed kind={q.mediaKind} url={q.mediaUrl} className="mt-5" />

              <div className="mt-6">
                {q.type === "SHORT_TEXT" && (
                  <input
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    className="field py-3.5 text-lg"
                    value={value}
                    maxLength={(max ?? 150) + 200}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        next();
                      }
                    }}
                    placeholder="Escribe tu respuesta"
                    aria-invalid={!!error}
                  />
                )}
                {q.type === "LONG_TEXT" && (
                  <textarea
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    className="field min-h-48 resize-y leading-relaxed"
                    value={value}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        next();
                      }
                    }}
                    placeholder="Escribe tu respuesta"
                    aria-invalid={!!error}
                  />
                )}
                {q.type === "TRUE_FALSE" && (
                  <div className="grid grid-cols-2 gap-3" role="radiogroup">
                    {[
                      { v: "true", label: "Verdadero", key: "V" },
                      { v: "false", label: "Falso", key: "F" },
                    ].map((o) => (
                      <ChoiceButton key={o.v} selected={value === o.v} hotkey={o.key} onClick={() => setAnswer(q.id, o.v)}>
                        {o.label}
                      </ChoiceButton>
                    ))}
                  </div>
                )}
                {q.type === "SINGLE_CHOICE" && (
                  <div className="grid gap-2.5" role="radiogroup">
                    {q.options.map((o, i) => (
                      <ChoiceButton key={o} selected={value === o} hotkey={String(i + 1)} onClick={() => setAnswer(q.id, o)}>
                        {o}
                      </ChoiceButton>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 flex min-h-6 items-start justify-between gap-4 text-sm">
                <AnimatePresence>
                  {error && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-ember"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                {max && (
                  <span
                    className={`ml-auto shrink-0 tabular-nums ${len > max ? "text-ember" : len > max * 0.9 ? "text-amber" : "text-fog"}`}
                  >
                    {len}/{max}
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="btn-ghost" onClick={() => (fromReview ? (setFromReview(false), go(REVIEW)) : go(step - 1))}>
                  <ArrowLeft className="size-4" /> {fromReview ? "Resumen" : "Atrás"}
                </button>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-fog sm:inline">
                    {q.type === "LONG_TEXT" ? "Ctrl + Enter para seguir" : "Enter para seguir"}
                  </span>
                  <button className="btn-primary px-5" onClick={next}>
                    {fromReview ? "Guardar y volver" : step === n - 1 ? "Revisar respuestas" : "Siguiente"}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Resumen */}
          {step === REVIEW && (
            <section>
              <h2 className="text-2xl font-bold">Revisa antes de enviar</h2>
              <p className="mt-1 text-fog">Una vez enviada no podrás editarla. Si algo no te convence, cámbialo ahora.</p>
              <ol className="mt-6 divide-y divide-seam rounded-lg border border-seam bg-deepslate">
                {questions.map((qq, i) => (
                  <li key={qq.id} className="flex gap-4 p-5">
                    <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-fog">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{qq.title}</p>
                      <p className="mt-1 whitespace-pre-line break-words text-fog">
                        {displayAnswer({ type: qq.type, value: answers[qq.id] ?? "" })}
                      </p>
                    </div>
                    <button
                      className="btn-ghost h-fit shrink-0 px-2.5 py-1.5 text-xs"
                      onClick={() => {
                        setFromReview(true);
                        go(i);
                      }}
                      aria-label={`Editar respuesta ${i + 1}`}
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                  </li>
                ))}
              </ol>
              {serverError && (
                <p role="alert" className="mt-4 rounded-md border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
                  {serverError}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button className="btn-ghost" onClick={() => go(n - 1)}>
                  <ArrowLeft className="size-4" /> Atrás
                </button>
                <button className="btn-primary px-6 py-3" onClick={submit} disabled={submitting || preview}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {preview ? "Envío desactivado en vista previa" : submitting ? "Enviando…" : "Enviar postulación"}
                </button>
              </div>
            </section>
          )}

          {/* Enviada */}
          {step === DONE && result && (
            <section className="flex flex-col items-center py-10 text-center">
              <motion.div
                initial={{ scale: 1.8, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="hex flex size-28 items-center justify-center bg-acento shadow-[0_0_60px_color-mix(in_oklab,var(--color-acento)_50%,transparent)]"
              >
                <Check className="size-12 text-bedrock" strokeWidth={3} />
              </motion.div>
              <h2 className="mt-8 text-3xl font-extrabold">Postulación enviada</h2>
              <p className="mt-2 font-mono text-acento">#{result.reference}</p>
              <p className="mt-4 max-w-[46ch] text-fog">
                El bot de {MARCA.nombre} te enviará un MD con la confirmación y con cada cambio de estado. También puedes seguirla
                desde aquí.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href={`/postulaciones/${result.id}`} className="btn-primary px-5">
                  Ver mi postulación
                </Link>
                <Link href="/postular" className="btn-ghost px-5">
                  Volver a los puestos
                </Link>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ChoiceButton({
  selected,
  hotkey,
  onClick,
  children,
}: {
  selected: boolean;
  hotkey: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors ${
        selected ? "border-acento bg-acento/10 text-bone" : "border-seam bg-slab/60 text-bone/90 hover:border-fog/40"
      }`}
    >
      <span
        className={`hex flex size-7 shrink-0 items-center justify-center font-mono text-xs font-semibold ${
          selected ? "bg-acento text-bedrock" : "bg-seam text-fog"
        }`}
      >
        {selected ? <Check className="size-3.5" strokeWidth={3} /> : hotkey}
      </span>
      <span className="font-medium">{children}</span>
    </button>
  );
}
