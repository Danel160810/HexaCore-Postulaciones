import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail, readJson } from "@/lib/http";
import { toggleInput } from "@/lib/validation";

/** Abrir o cerrar temporalmente una categoría (solo Admin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiViewer("admin");
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await readJson(req, toggleInput);
  if ("error" in body) return body.error;

  const res = await prisma.form.updateMany({
    where: { id, archived: false },
    data: { isOpen: body.data.isOpen, closedNote: body.data.closedNote },
  });
  if (res.count === 0) return fail(404, "Este formulario no existe o está archivado.");
  return NextResponse.json({ ok: true });
}
