import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail, readJson } from "@/lib/http";
import { formInput } from "@/lib/validation";
import { formData, isUniqueError, questionData } from "@/lib/forms";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Guardar formulario (solo Admin). Las preguntas se reemplazan enteras:
 * las postulaciones ya enviadas guardan su propia copia, así que no se ven afectadas.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await apiViewer("admin");
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await readJson(req, formInput);
  if ("error" in body) return body.error;
  const input = body.data;

  const exists = await prisma.form.count({ where: { id } });
  if (!exists) return fail(404, "Este formulario no existe.");

  try {
    await prisma.$transaction([
      prisma.form.update({ where: { id }, data: { ...formData(input), archived: false } }),
      prisma.question.deleteMany({ where: { formId: id } }),
      prisma.question.createMany({
        data: input.questions.map((q, i) => ({ ...questionData(q, i), formId: id })),
      }),
    ]);
  } catch (e) {
    if (isUniqueError(e)) return fail(409, "Ya existe un formulario con esa URL.", { issues: [{ path: "slug", message: "URL en uso" }] });
    throw e;
  }
  return NextResponse.json({ ok: true });
}

/**
 * Borrar formulario (solo Admin).
 * Si ya tiene postulaciones se archiva (se oculta y se cierra) para no perder el historial.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await apiViewer("admin");
  if (auth.error) return auth.error;
  const { id } = await params;

  const form = await prisma.form.findUnique({ where: { id }, include: { _count: { select: { applications: true } } } });
  if (!form) return fail(404, "Este formulario no existe.");

  if (form._count.applications > 0) {
    await prisma.form.update({ where: { id }, data: { archived: true, isOpen: false } });
    return NextResponse.json({ ok: true, archived: true });
  }
  await prisma.form.delete({ where: { id } });
  return NextResponse.json({ ok: true, archived: false });
}
