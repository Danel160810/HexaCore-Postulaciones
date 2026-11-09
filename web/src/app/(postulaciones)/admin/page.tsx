import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BellOff, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { avatarUrl } from "@/lib/discord";
import { fmtRelative } from "@/lib/format";
import { STATUS, type AppStatus } from "@/lib/status";
import { StatusBadge } from "@/components/Status";

export const metadata = { title: "Panel staff" };

const PAGE_SIZE = 25;
const TABS: { key: AppStatus | "OPEN" | "ALL"; label: string }[] = [
  { key: "OPEN", label: "Por resolver" },
  { key: "PENDING", label: STATUS.PENDING.label },
  { key: "IN_REVIEW", label: STATUS.IN_REVIEW.label },
  { key: "APPROVED", label: STATUS.APPROVED.label },
  { key: "REJECTED", label: STATUS.REJECTED.label },
  { key: "ALL", label: "Todas" },
];

type SP = { estado?: string; form?: string; q?: string; page?: string };

export default async function AdminInbox({ searchParams }: { searchParams: Promise<SP> }) {
  await requireViewer("reviewer", "/admin");
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.estado)?.key ?? "OPEN") as (typeof TABS)[number]["key"];
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() ?? "";

  const where: Prisma.ApplicationWhereInput = {
    ...(tab === "OPEN"
      ? { status: { in: ["PENDING", "IN_REVIEW"] } }
      : tab === "ALL"
        ? {}
        : { status: tab }),
    ...(sp.form ? { formId: sp.form } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { user: { username: { contains: q, mode: "insensitive" } } },
            { user: { globalName: { contains: q, mode: "insensitive" } } },
            { userId: q },
          ],
        }
      : {}),
  };

  const [rows, total, counts, forms] = await Promise.all([
    prisma.application.findMany({
      where,
      // Las más antiguas primero en la cola; las más recientes primero en el histórico
      orderBy: { createdAt: tab === "OPEN" || tab === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, username: true, globalName: true, avatar: true } },
        form: { select: { title: true, tag: true } },
        reviewer: { select: { username: true, globalName: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.application.count({ where }),
    prisma.application.groupBy({
      by: ["status"],
      where: sp.form ? { formId: sp.form } : undefined,
      _count: { _all: true },
    }),
    prisma.form.findMany({ orderBy: { position: "asc" }, select: { id: true, title: true } }),
  ]);

  const countOf = (k: string) => {
    if (k === "ALL") return counts.reduce((s, c) => s + c._count._all, 0);
    if (k === "OPEN") return counts.filter((c) => c.status === "PENDING" || c.status === "IN_REVIEW").reduce((s, c) => s + c._count._all, 0);
    return counts.find((c) => c.status === k)?._count._all ?? 0;
  };

  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { estado: tab, form: sp.form, q, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, String(v)));
    return `/admin?${p.toString()}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">Bandeja</h1>
          <p className="mt-1 text-fog">
            {countOf("OPEN") === 0 ? "Nada pendiente. Buen trabajo." : `${countOf("OPEN")} postulaciones esperan una decisión.`}
          </p>
        </div>
      </header>

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-seam" aria-label="Filtrar por estado">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={href({ estado: t.key, page: undefined })}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition-colors ${
                active ? "border-acento text-bone" : "border-transparent text-fog hover:text-bone"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-acento/15 text-acento" : "bg-slab text-fog"}`}>
                {countOf(t.key)}
              </span>
            </Link>
          );
        })}
      </nav>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row" action="/admin">
        <input type="hidden" name="estado" value={tab} />
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fog" />
          <input name="q" defaultValue={q} placeholder="Buscar por referencia, usuario o ID de Discord" className="field pl-9" />
        </label>
        <select name="form" defaultValue={sp.form ?? ""} className="field sm:w-56">
          <option value="">Todas las categorías</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
        <button className="btn-ghost">Filtrar</button>
      </form>

      <div className="mt-5 overflow-hidden rounded-lg border border-seam bg-deepslate">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-fog">No hay postulaciones con estos filtros.</p>
        ) : (
          <ul className="divide-y divide-seam">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/postulaciones/${a.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-slab md:grid-cols-[auto_1.4fr_1fr_auto_auto]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl(a.user.id, a.user.avatar, 64)} alt="" className="hex size-10 bg-slab" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.user.globalName || a.user.username}</p>
                    <p className="truncate text-sm text-fog">
                      @{a.user.username} <span className="font-mono">#{a.reference}</span>
                    </p>
                  </div>
                  <div className="col-start-2 text-sm text-fog md:col-start-auto">
                    <span className="text-bone/90">{a.form.title}</span>
                    <span className="block text-xs">enviada {fmtRelative(a.createdAt)}</span>
                  </div>
                  <div className="col-start-2 flex items-center gap-3 text-xs text-fog md:col-start-auto">
                    {a.score !== null && a.maxScore !== null && (
                      <span title="Aciertos en preguntas autocorregidas" className="tabular-nums">
                        {a.score}/{a.maxScore} aciertos
                      </span>
                    )}
                    {a._count.comments > 0 && <span>{a._count.comments} notas</span>}
                    {a.dmFailed && <BellOff className="size-3.5 text-amber" aria-label="MD no entregado" />}
                  </div>
                  <div className="col-start-3 row-start-1 flex flex-col items-end gap-1 md:col-start-auto">
                    <StatusBadge status={a.status as AppStatus} />
                    {a.reviewer && (
                      <span className="text-xs text-fog">por {a.reviewer.globalName || a.reviewer.username}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Paginación">
          <span className="text-fog">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn-ghost" href={href({ page: String(page - 1) })}>
                Anterior
              </Link>
            )}
            {page < pages && (
              <Link className="btn-ghost" href={href({ page: String(page + 1) })}>
                Siguiente
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
