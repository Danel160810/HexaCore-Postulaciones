import Link from "next/link";
import { ArrowUpRight, Clock3, ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { eligibility } from "@/lib/applications";
import { DISCORD_INVITE } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/Status";
import type { AppStatus } from "@/lib/status";
import { MARCA } from "@/config/marca";

export const metadata = { title: "Postulaciones" };

export default async function PostularPage() {
  const viewer = await requireViewer("user", "/postular");

  const [forms, apps] = await Promise.all([
    prisma.form.findMany({
      where: { archived: false },
      orderBy: [{ isOpen: "desc" }, { position: "asc" }],
      include: { _count: { select: { questions: true } } },
    }),
    prisma.application.findMany({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
      include: { form: { select: { title: true, tag: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Puestos del equipo</h1>
        <p className="mt-3 text-fog">Elige el puesto al que quieres presentarte. Solo puedes tener una postulación en curso a la vez.</p>
      </header>

      {!viewer.isMember && (
        <div role="status" className="mt-8 flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber">
            {viewer.inGuild
              ? "Te falta el rol Miembro en el Discord. Verifícate en el servidor y recarga esta página."
              : `No te encontramos en el Discord de ${MARCA.nombre}. Únete para poder postular.`}
          </p>
          {!viewer.inGuild && DISCORD_INVITE && (
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-ghost shrink-0">
              Unirme al Discord
            </a>
          )}
        </div>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-seam p-10 text-center text-fog">
            Todavía no hay puestos publicados. Vuelve pronto.
          </p>
        )}
        {forms.map((form) => {
          const check = eligibility(viewer, form, form._count.questions, apps);
          const open = form.isOpen;
          return (
            <article
              key={form.id}
              className={`chamfer p-px ${open ? "bg-linear-to-br from-acento/60 via-seam to-seam" : "bg-seam"}`}
            >
              <div className="chamfer flex h-full flex-col bg-deepslate p-6">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="rounded-full border border-seam px-2.5 py-0.5 text-fog">{form.tag}</span>
                  <span className={open ? "font-semibold text-acento" : "text-fog"}>{open ? "Abierta" : "Cerrada"}</span>
                </div>
                <h2 className={`mt-4 text-2xl font-bold ${open ? "" : "text-bone/70"}`}>{form.title}</h2>
                <p className="mt-2 flex-1 text-sm text-fog">{form.summary}</p>

                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fog">
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="size-3.5" /> {form._count.questions} preguntas
                  </span>
                  {form.cooldownDays > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5" /> {form.cooldownDays} días de espera si te rechazan
                    </span>
                  )}
                </div>

                {check.ok ? (
                  <Link href={`/postular/${form.slug}`} className="btn-primary mt-5 w-full">
                    Empezar postulación
                  </Link>
                ) : (
                  <div className="mt-5">
                    <p className="rounded-md border border-seam bg-slab/70 px-3.5 py-2.5 text-sm text-fog">{check.message}</p>
                    {check.reason === "active" && check.activeId && (
                      <Link href={`/postulaciones/${check.activeId}`} className="btn-ghost mt-2 w-full">
                        Ver mi postulación en curso
                      </Link>
                    )}
                  </div>
                )}
                {viewer.isAdmin && (
                  <Link href={`/postular/${form.slug}?preview=1`} className="mt-3 text-center text-xs text-fog hover:text-acento">
                    Vista previa (admin)
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">Tus postulaciones</h2>
        <p className="mt-1 text-fog">El estado se actualiza aquí y te llega por MD.</p>

        {apps.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-seam p-8 text-center text-fog">
            Aún no has enviado ninguna. Cuando lo hagas, podrás seguirla desde aquí.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-seam overflow-hidden rounded-lg border border-seam bg-deepslate">
            {apps.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/postulaciones/${a.id}`}
                  className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-slab sm:flex-row sm:items-center sm:gap-5"
                >
                  <span className="hex flex size-10 shrink-0 items-center justify-center bg-slab font-display text-sm font-bold text-acento max-sm:hidden">
                    {a.form.tag.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Postulación a {a.form.title}</p>
                    <p className="text-sm text-fog">
                      <span className="font-mono">#{a.reference}</span>, enviada el {fmtDateTime(a.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={a.status as AppStatus} />
                  <ArrowUpRight className="size-4 text-fog transition-colors group-hover:text-acento max-sm:hidden" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
