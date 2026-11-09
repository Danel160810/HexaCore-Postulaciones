import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/rbac";
import { FormBuilder } from "@/components/admin/FormBuilder";

export const metadata = { title: "Editar formulario" };

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewer("admin", `/admin/formularios/${id}`);

  const form = await prisma.form.findUnique({
    where: { id },
    include: { questions: { orderBy: { position: "asc" } } },
  });

  if (!form) notFound();

  return (
    <div className="w-full min-w-0">
      <p className="text-sm text-fog break-words">
        {form.archived ? "Archivado: guárdalo para restaurarlo" : form.tag}
      </p>
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight break-words">
        {form.title}
      </h1>
      <FormBuilder
        initial={{
          id: form.id,
          slug: form.slug,
          title: form.title,
          tag: form.tag,
          summary: form.summary,
          intro: form.intro ?? "",
          refPrefix: form.refPrefix,
          isOpen: form.isOpen,
          closedNote: form.closedNote ?? "",
          cooldownDays: String(form.cooldownDays),
          acceptedRoleId: form.acceptedRoleId ?? "",
          requiredRoleId: form.requiredRoleId ?? "",
          position: String(form.position),
          archived: form.archived,
          questions: form.questions.map((q) => ({
            key: q.id,
            type: q.type,
            title: q.title,
            help: q.help ?? "",
            required: q.required,
            minLength: q.minLength?.toString() ?? "",
            maxLength: q.maxLength?.toString() ?? "",
            options: q.options,
            correct: q.correct ?? "",
            mediaKind: q.mediaKind,
            mediaUrl: q.mediaUrl ?? "",
          })),
        }}
      />
    </div>
  );
}
