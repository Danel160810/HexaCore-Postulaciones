import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail, readJson } from "@/lib/http";
import { commentInput } from "@/lib/validation";

/** Comentario interno (el postulante nunca lo ve). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiViewer("reviewer");
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await readJson(req, commentInput);
  if ("error" in body) return body.error;

  const exists = await prisma.application.count({ where: { id } });
  if (!exists) return fail(404, "Esta postulación no existe.");

  const comment = await prisma.internalComment.create({
    data: { applicationId: id, authorId: auth.viewer.id, body: body.data.body },
    include: { author: { select: { id: true, username: true, globalName: true, avatar: true } } },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
