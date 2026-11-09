/** Traduce errores de Prisma/PostgreSQL a un mensaje que diga qué revisar. */
export function describeDbError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code ?? "";
  const msg = e instanceof Error ? e.message : String(e);
  if (code === "P2021" || /does not exist in the current database/.test(msg))
    return "Faltan las tablas en la base de datos. Ejecuta prisma/setup.sql en Supabase (SQL Editor) o `npx prisma db push`.";
  if (code === "P1001" || /Can't reach database server/.test(msg))
    return "No se puede conectar con la base de datos. Revisa la integración de Supabase en Vercel.";
  if (code === "P1000" || /Authentication failed/.test(msg))
    return "La contraseña o el usuario de la base de datos no son correctos. Si cambiaste la contraseña en Supabase, vuelve a conectar la integración en Vercel.";
  if (code === "P1012" || /Environment variable not found|must start with the protocol/.test(msg))
    return "POSTGRES_PRISMA_URL o POSTGRES_URL_NON_POOLING no están definidas en Vercel (o no empiezan por postgresql://).";
  if (/prepared statement/.test(msg))
    return "Añade ?pgbouncer=true&connection_limit=1 al final de POSTGRES_PRISMA_URL.";
  return `Error de base de datos${code ? ` (${code})` : ""}: ${msg.split("\n").filter(Boolean).pop()?.slice(0, 200)}`;
}

/** Mensaje para jugadores: sin detalles internos de la base de datos (el detalle va al log). */
export function publicDbError(): string {
  return "Ha fallado algo en la web. Prueba otra vez en un momento; si sigue, avisa en Discord.";
}
