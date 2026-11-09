import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { eligibility, userAppsFor } from "@/lib/applications";
import { FormRunner, type RunnerQuestion } from "@/components/FormRunner";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.form.findUnique({ where: { slug }, select: { title: true } });
  return { title: form ? `Postulación a ${form.title}` : "Postulación" };
}

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const viewer = await requireViewer("user", `/postular/${slug}`);

  const form = await prisma.form.findUnique({
    where: { slug },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!form || (form.archived && !viewer.isAdmin)) notFound();

  const isPreview = preview === "1" && viewer.isAdmin;
  const check = eligibility(viewer, form, form.questions.length, await userAppsFor(viewer.id));

  // ¡Importante! Nunca mandamos la respuesta correcta al navegador.
  const questions: RunnerQuestion[] = form.questions.map((q) => ({
    id: q.id,
    type: q.type,
    title: q.title,
    help: q.help,
    required: q.required,
    minLength: q.minLength,
    maxLength: q.maxLength,
    options: q.options,
    mediaKind: q.mediaKind,
    mediaUrl: q.mediaUrl,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <Link href="/postular" className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-bone">
        <ArrowLeft className="size-4" /> Volver a los puestos
      </Link>

      {isPreview && (
        <p className="mt-4 rounded-md border border-sky/40 bg-sky/10 px-4 py-2.5 text-sm text-sky">
          Vista previa de admin: puedes recorrer el examen, pero el envío está desactivado.
        </p>
      )}

      {!check.ok && !isPreview ? (
        <div className="chamfer mt-8 bg-seam p-px">
          <div className="chamfer bg-deepslate p-8">
            <p className="text-sm text-fog">{form.tag}</p>
            <h1 className="mt-1 text-3xl font-extrabold">Postulación a {form.title}</h1>
            <p className="mt-5 text-bone/90">{check.message}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {check.reason === "active" && check.activeId ? (
                <Link href={`/postulaciones/${check.activeId}`} className="btn-primary">
                  Ver mi postulación en curso
                </Link>
              ) : (
                <Link href="/postular" className="btn-ghost">
                  Ver otros puestos
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <FormRunner
          form={{
            id: form.id,
            title: form.title,
            tag: form.tag,
            intro: form.intro,
            version: form.updatedAt.getTime(),
          }}
          questions={questions}
          preview={isPreview}
        />
      )}
    </div>
  );
}
