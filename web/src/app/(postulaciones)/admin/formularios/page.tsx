import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { ToggleOpen } from "@/components/admin/ToggleOpen";

export const metadata = { title: "Formularios" };

export default async function FormsAdmin() {
  await requireViewer("admin", "/admin/formularios");

  const forms = await prisma.form.findMany({
    orderBy: [{ archived: "asc" }, { position: "asc" }],
    include: {
      _count: { select: { questions: true, applications: true } },
      applications: { where: { status: { in: ["PENDING", "IN_REVIEW"] } }, select: { id: true } },
    },
  });
  const active = forms.filter((f) => !f.archived);
  const archived = forms.filter((f) => f.archived);

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">Formularios</h1>
          <p className="mt-1 text-fog">Crea exámenes, ordena preguntas y abre o cierra cada puesto.</p>
        </div>
        <Link href="/admin/formularios/nuevo" className="btn-primary">
          <Plus className="size-4" /> Nuevo formulario
        </Link>
      </header>

      <ul className="mt-8 space-y-3">
        {active.length === 0 && (
          <li className="rounded-lg border border-dashed border-seam p-10 text-center text-fog">
            No hay formularios. Crea el primero o ejecuta <code className="font-mono text-bone">npm run db:seed</code>.
          </li>
        )}
        {active.map((f) => (
          <li
            key={f.id}
            className="flex flex-col gap-4 rounded-lg border border-seam bg-deepslate p-5 md:flex-row md:items-center"
          >
            <span className="hex flex size-12 shrink-0 items-center justify-center bg-slab font-display font-bold text-acento max-md:hidden">
              {f.refPrefix}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{f.title}</h2>
                <span className="rounded-full border border-seam px-2 py-0.5 text-xs text-fog">{f.tag}</span>
              </div>
              <p className="mt-0.5 text-sm text-fog">
                {f._count.questions} preguntas, {f._count.applications} postulaciones
                {f.applications.length > 0 && <span className="text-amber">, {f.applications.length} por resolver</span>}
              </p>
            </div>
            <ToggleOpen id={f.id} isOpen={f.isOpen} closedNote={f.closedNote} />
            <div className="flex gap-2">
              <Link href={`/postular/${f.slug}?preview=1`} className="btn-ghost">
                Vista previa
              </Link>
              <Link href={`/admin/formularios/${f.id}`} className="btn-ghost">
                Editar
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold">Archivados</h2>
          <p className="mt-1 text-sm text-fog">
            Formularios borrados que tenían postulaciones. Se conservan para el historial; guárdalos de nuevo para restaurarlos.
          </p>
          <ul className="mt-4 divide-y divide-seam rounded-lg border border-seam">
            {archived.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-fog">
                  {f.title} ({f._count.applications} postulaciones)
                </span>
                <Link href={`/admin/formularios/${f.id}`} className="text-acento hover:underline">
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
