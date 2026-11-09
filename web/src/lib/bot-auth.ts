import { timingSafeEqual } from "node:crypto";
import { fail } from "./http";

/** Comprueba "Authorization: Bearer <BOT_API_SECRET>". Devuelve una respuesta de error o null. */
export function checkBot(req: Request) {
  return checkSecret(req, "BOT_API_SECRET", "Secreto del bot incorrecto.");
}

/** Igual que checkBot pero con la variable que se indique (p. ej. MC_STATUS_SECRET del plugin). */
export function checkSecret(req: Request, envName: string, wrong = "Secreto incorrecto.") {
  const secret = process.env[envName];
  if (!secret || secret.length < 16) return fail(503, `${envName} no está configurado en la web.`);

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fail(401, wrong);
  return null;
}
