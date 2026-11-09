import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail, readJson } from "@/lib/http";
import { formInput } from "@/lib/validation";
import { formData, isUniqueError, questionData } from "@/lib/forms";

/** Crear formulario (solo Admin) */
export async function POST(req: Request) {
  const auth = await apiViewer("admin");
  if (auth.error) return auth.error;

  const body = await readJson(req, formInput);
  if ("error" in body) return body.error;
  const input = body.data;

  try {
    const form = await prisma.form.create({
      data: {
        ...formData(input),
        questions: { create: input.questions.map((q, i) => questionData(q, i)) },
      },
      select: { id: true, slug: true },
    });
    return NextResponse.json({ form }, { status: 201 });
  } catch (e) {
    if (isUniqueError(e)) return fail(409, "Ya existe un formulario con esa URL.", { issues: [{ path: "slug", message: "URL en uso" }] });
    throw e;
  }
}
