import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiViewer } from "@/lib/rbac";
import { fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** El postulante retira su postulación (solo mientras está en cola, sin revisar). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiViewer();
  if (auth.error) return auth.error;
  const limited = await rateLimit(`retirar:${auth.viewer.id}`, 10, 600);
  if (limited) return limited;
  const { id } = await params;

  const res = await prisma.application.updateMany({
    where: { id, userId: auth.viewer.id, status: "PENDING" },
    data: { status: "WITHDRAWN" },
  });
  if (res.count === 0) return fail(409, "Solo puedes retirar una postulación que todavía no está en revisión.");

  await prisma.applicationEvent.create({
    data: { applicationId: id, status: "WITHDRAWN", actorId: auth.viewer.id },
  });
  return NextResponse.json({ ok: true });
}
