import { NextResponse } from "next/server";
import type { ZodType, ZodTypeDef } from "zod";
import { zodIssues } from "./validation";

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Lee y valida el JSON del body. Devuelve { data } o { error: Response }. */
export async function readJson<T>(req: Request, schema: ZodType<T, ZodTypeDef, any>) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail(400, "El cuerpo de la petición no es JSON válido.") } as const;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: fail(422, "Revisa los campos marcados.", { issues: zodIssues(parsed.error) }) } as const;
  }
  return { data: parsed.data } as const;
}
