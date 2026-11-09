import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellOff, CircleCheck, CircleX, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { avatarUrl } from "@/lib/discord";
import { fmtDateTime } from "@/lib/format";
import { ROLE_ADMIN, ROLE_REVIEWER } from "@/lib/env";
import { displayAnswer, type AnswerSnapshot, type AppStatus } from "@/lib/status";
import { StatusBadge, StatusSeal } from "@/components/Status";
import { Timeline } from "@/components/Timeline";
import { MediaEmbed } from "@/components/MediaEmbed";
import { StatusControl } from "@/components/admin/StatusControl";
import { CommentThread } from "@/components/admin/CommentThread";

export const metadata = { title: "Revisar postulación" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer("reviewer", `/admin/postulaciones/${id}`);

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      user: true,
      form: { select: { title: true, tag: true, cooldownDays: true, acceptedRoleId: true } },
      reviewer: { select: { username: true, globalName: true } },
      events: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { username: true, globalName: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, username: true, globalName: true, avatar: true } } },
      },
    },
  });
  if (!app) notFound();

  const history = await prisma.application.findMany({
    where: { userId: app.userId, id: { not: app.id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, reference: true, status: true, createdAt: true, form: { select: { title: true } } },
  });

  const status = app.status as AppStatus;
  const answers = app.answers as unknown as AnswerSnapshot[];
  const u = app.user;
  const userIsStaff = u.roles.includes(ROLE_REVIEWER) || u.roles.includes(ROLE_ADMIN);

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-bone">
        <ArrowLeft className="size-4" /> Volver a la bandeja
      </Link>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <StatusSeal status={status} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fog">{app.form.tag}</p>
          <h1 className="text-3xl font-extrabold">
            {u.globalName || u.username} quiere entrar como {app.form.title}
          </h1>
          <p className="mt-1 text-fog">
            <span className="font-mono text-bone/80">#{app.reference}</span>, enviada el {fmtDateTime(app.createdAt)}
          </p>
        </div>
        <StatusBadge status={status} className="self-start text-sm sm:self-center" />
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Respuestas */}
        <div className="space-y-6">
          {app.maxScore !== null && (
            <div className="flex items-center gap-4 rounded-lg border border-seam bg-deepslate px-6 py-4">
              <span className="font-display text-3xl font-extrabold tabular-nums">
                {app.score}/{app.maxScore}
              </span>
              <p className="text-sm text-fog">
                aciertos en las preguntas autocorregidas (verdadero/falso y opción única con respuesta marcada)
              </p>
            </div>
          )}

          <section className="overflow-hidden rounded-lg border border-seam bg-deepslate">
            <h2 className="border-b border-seam px-6 py-4 text-lg font-bold">Respuestas</h2>
            <ol className="divide-y divide-seam">
              {answers.map((a, i) => (
                <li key={a.questionId ?? i} className="flex gap-4 px-6 py-5">
                  <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-fog">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    {a.mediaKind && a.mediaKind !== "NONE" && (
                      <MediaEmbed kind={a.mediaKind} url={a.mediaUrl} className="mt-3 max-w-lg" />
                    )}
                    <p className="mt-2 whitespace-pre-line break-words text-bone/85">{displayAnswer(a)}</p>
                    {a.isCorrect != null && (
                      <p className={`mt-2 flex items-center gap-1.5 text-sm ${a.isCorrect ? "text-acento" : "text-ember"}`}>
                        {a.isCorrect ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
                        {a.isCorrect
                          ? "Correcta"
                          : `Incorrecta. La correcta era: ${displayAnswer({ type: a.type, value: a.correct ?? "" })}`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-seam bg-deepslate p-6">
            <h2 className="text-lg font-bold">Notas internas</h2>
            <p className="mt-1 text-sm text-fog">Solo las ve el staff. El postulante nunca las recibe.</p>
            <CommentThread
              applicationId={app.id}
              initial={app.comments.map((c) => ({
                id: c.id,
                body: c.body,
                createdAt: c.createdAt.toISOString(),
                author: {
                  name: c.author.globalName || c.author.username,
                  avatarUrl: avatarUrl(c.author.id, c.author.avatar, 64),
                },
              }))}
            />
          </section>
        </div>

        {/* Lateral */}
        <aside className="space-y-4">
          <StatusControl
            applicationId={app.id}
            status={status}
            isAdmin={viewer.isAdmin}
            cooldownDays={app.form.cooldownDays}
            givesRole={!!app.form.acceptedRoleId}
            currentNote={app.decisionNote}
          />

          <section className="rounded-lg border border-seam bg-deepslate p-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl(u.id, u.avatar)} alt="" className="hex size-12 bg-slab" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.globalName || u.username}</p>
                <p className="truncate text-sm text-fog">@{u.username}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fog">ID de Discord</dt>
                <dd className="font-mono">{u.id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fog">En el servidor</dt>
                <dd className={u.inGuild ? "text-acento" : "text-ember"}>{u.inGuild ? "Sí" : "Ya no"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fog">Roles</dt>
                <dd>
                  {u.roles.length}
                  {userIsStaff ? ", ya es staff" : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fog">Primera visita</dt>
                <dd>{fmtDateTime(u.createdAt)}</dd>
              </div>
            </dl>
            <a
              href={`https://discord.com/users/${u.id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-acento hover:underline"
            >
              Abrir perfil en Discord <ExternalLink className="size-3.5" />
            </a>
            {app.dmFailed && (
              <p className="mt-4 flex gap-2 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
                <BellOff className="mt-0.5 size-4 shrink-0" />
                El último MD no llegó: tiene los mensajes directos cerrados. Verá el estado en la web.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-seam bg-deepslate p-5">
            <h2 className="mb-4 font-semibold">Historial de esta postulación</h2>
            <Timeline
              showActor
              events={app.events.map((e) => ({
                id: e.id,
                status: e.status as AppStatus,
                createdAt: e.createdAt,
                note: e.note,
                actorName: e.actor ? e.actor.globalName || e.actor.username : null,
              }))}
            />
          </section>

          {history.length > 0 && (
            <section className="rounded-lg border border-seam bg-deepslate p-5">
              <h2 className="font-semibold">Otras postulaciones suyas</h2>
              <ul className="mt-3 space-y-2">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/admin/postulaciones/${h.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-acento">
                      <span className="min-w-0 truncate">
                        {h.form.title} <span className="font-mono text-fog">#{h.reference}</span>
                      </span>
                      <StatusBadge status={h.status as AppStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
