import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BellOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/format";
import { STATUS, displayAnswer, type AnswerSnapshot, type AppStatus } from "@/lib/status";
import { StatusBadge, StatusSeal } from "@/components/Status";
import { Timeline } from "@/components/Timeline";
import { MediaEmbed } from "@/components/MediaEmbed";
import { WithdrawButton } from "@/components/WithdrawButton";
import { MARCA } from "@/config/marca";

export const metadata = { title: "Mi postulación" };

export default async function MyApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer("user", `/postulaciones/${id}`);

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      form: { select: { title: true, tag: true, cooldownDays: true } },
      events: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, createdAt: true } },
    },
  });
  if (!app) notFound();
  if (app.userId !== viewer.id) {
    if (viewer.isReviewer) redirect(`/admin/postulaciones/${id}`);
    notFound();
  }

  const status = app.status as AppStatus;
  const answers = app.answers as unknown as AnswerSnapshot[];
  const decided = status === "APPROVED" || status === "REJECTED";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <Link href="/postular" className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-bone">
        <ArrowLeft className="size-4" /> Volver a mis postulaciones
      </Link>

      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <StatusSeal status={status} size={84} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Postulación a {app.form.title}</h1>
          <p className="mt-1 text-fog">
            <span className="font-mono text-bone/80">#{app.reference}</span>, enviada el {fmtDateTime(app.createdAt)}
          </p>
        </div>
        <StatusBadge status={status} className="self-start text-sm sm:self-center" />
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {decided && app.decisionNote && (
            <section
              className={`rounded-lg border p-6 ${
                status === "REJECTED" ? "border-ember/35 bg-ember/[0.07]" : "border-acento/35 bg-acento/[0.07]"
              }`}
            >
              <h2 className={`text-sm font-semibold ${status === "REJECTED" ? "text-ember" : "text-acento"}`}>
                {status === "REJECTED" ? "Motivo del rechazo" : "Mensaje del equipo"}
              </h2>
              <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">{app.decisionNote}</p>
              {status === "REJECTED" && app.cooldownUntil && (
                <p className="mt-4 text-sm text-fog">
                  Podrás volver a postular a {app.form.title} a partir del {fmtDateTime(app.cooldownUntil)} (hora de España).
                </p>
              )}
            </section>
          )}

          <section className="rounded-lg border border-seam bg-deepslate p-6">
            <h2 className="mb-5 text-lg font-bold">Seguimiento</h2>
            <Timeline events={app.events.map((e) => ({ ...e, status: e.status as AppStatus }))} />
          </section>

          <section className="overflow-hidden rounded-lg border border-seam bg-deepslate">
            <div className="flex items-center justify-between border-b border-seam px-6 py-4">
              <h2 className="text-lg font-bold">Tus respuestas</h2>
              <span className="text-xs text-fog">Solo lectura</span>
            </div>
            <dl className="divide-y divide-seam">
              {answers.map((a, i) => (
                <div key={a.questionId ?? i} className="px-6 py-5">
                  <dt className="font-medium">{a.title}</dt>
                  {a.mediaKind && a.mediaKind !== "NONE" && (
                    <MediaEmbed kind={a.mediaKind} url={a.mediaUrl} className="mt-3 max-w-lg" />
                  )}
                  <dd className="mt-1.5 whitespace-pre-line break-words text-fog">{displayAnswer(a)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-seam bg-deepslate p-5">
            <h2 className="font-semibold">Avisos</h2>
            <p className="mt-2 text-sm text-fog">El bot de {MARCA.nombre} te escribe por MD en cada cambio de estado.</p>
            {app.dmFailed && (
              <p className="mt-3 flex gap-2 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
                <BellOff className="mt-0.5 size-4 shrink-0" />
                No pudimos enviarte el último MD. Revisa que tengas los mensajes directos abiertos para el servidor.
              </p>
            )}
          </div>
          {app.form.cooldownDays > 0 && (
            <div className="rounded-lg border border-seam bg-deepslate p-5">
              <h2 className="font-semibold">Volver a postular</h2>
              <p className="mt-2 text-sm text-fog">
                Si te rechazan, podrás presentarte otra vez a {app.form.title} pasados {app.form.cooldownDays}{" "}
                {app.form.cooldownDays === 1 ? "día" : "días"}.
              </p>
            </div>
          )}
          {status === "PENDING" && (
            <div className="rounded-lg border border-seam bg-deepslate p-5">
              <h2 className="font-semibold">¿Te has equivocado?</h2>
              <p className="mt-2 text-sm text-fog">
                Mientras nadie la haya revisado puedes retirarla y enviar otra. Retirarla no activa la espera.
              </p>
              <WithdrawButton id={app.id} />
            </div>
          )}
          <p className="px-1 text-xs text-fog">Estado actual: {STATUS[status].label}.</p>
        </aside>
      </div>
    </div>
  );
}
