import { redirect } from "next/navigation";
import { getViewer } from "@/lib/rbac";
import { LoginButton } from "@/components/LoginButton";
import { DISCORD_INVITE } from "@/lib/env";
import { MARCA } from "@/config/marca";

export const metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  AccessDenied: "Cancelaste la autorización en Discord. Vuelve a intentarlo cuando quieras.",
  OAuthCallback:
    "Discord rechazó el intercambio de la sesión. Suele ser DISCORD_CLIENT_SECRET incorrecto (o restablecido en Discord sin actualizarlo en Vercel), o un NEXTAUTH_URL distinto de la web en la que estás.",
  Database: "Discord respondió bien, pero la web no pudo guardar tu sesión en la base de datos. Abre /api/health para ver qué falta.",
  Callback: "No pudimos completar el inicio de sesión. Prueba otra vez.",
  Configuration: "La web no está bien configurada (revisa las variables de Discord y NEXTAUTH).",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const viewer = await getViewer();
  const safeCallback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/postular";
  if (viewer) redirect(safeCallback);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
      <section className="chamfer bg-seam p-px">
        <div className="chamfer h-full bg-deepslate p-7 sm:p-9">
          <h1 className="text-4xl font-extrabold">Entra para postular</h1>
          <p className="mt-3 max-w-[46ch] text-fog">
            Usamos tu cuenta de Discord para saber quién eres y qué roles tienes en el servidor de {MARCA.nombre}.
          </p>

          {error && (
            <p role="alert" className="mt-5 rounded-md border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
              {ERRORS[error] ?? "No pudimos iniciar sesión. Prueba otra vez."}
              <span className="mt-1 block font-mono text-xs opacity-70">Código: {error}</span>
            </p>
          )}

          <LoginButton callbackUrl={safeCallback} />

          <div className="mt-8 border-t border-seam pt-6">
            <h2 className="text-sm font-semibold">Qué verá {MARCA.nombre} de tu cuenta</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-medium">Tu nombre y tu avatar</dt>
                <dd className="text-fog">Para mostrarlos en tu postulación.</dd>
              </div>
              <div>
                <dt className="font-medium">Tus roles en el Discord de {MARCA.nombre}</dt>
                <dd className="text-fog">Para saber si eres miembro verificado o parte del staff. Solo de este servidor.</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-fog">
              No podemos leer tus mensajes ni escribir en tu nombre. Al entrar aceptas que el staff lea tus respuestas y
              guarde tu historial de postulaciones.
            </p>
          </div>
        </div>
      </section>

      <aside className="space-y-3 lg:pt-4">
        <h2 className="mb-4 text-lg font-bold">Antes de empezar</h2>
        {[
          {
            t: `Estar en el Discord de ${MARCA.nombre}`,
            d: "Sin estar dentro no podemos leer tus roles.",
            link: DISCORD_INVITE,
          },
          { t: "Tener el rol Miembro", d: "Se consigue al verificarte en el servidor." },
          { t: "Tener los MD abiertos", d: "El bot te avisa por mensaje directo. Si los tienes cerrados, verás el estado igualmente aquí." },
        ].map((item) => (
          <div key={item.t} className="flex gap-3 rounded-lg border border-seam bg-deepslate/60 p-4">
            <span className="hex mt-1 size-3 shrink-0 bg-acento" />
            <div>
              <p className="font-semibold">{item.t}</p>
              <p className="text-sm text-fog">{item.d}</p>
              {item.link && (
                <a href={item.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-acento hover:underline">
                  Unirme al Discord
                </a>
              )}
            </div>
          </div>
        ))}
        <p className="pt-2 text-sm text-fog">El staff entra por esta misma pantalla: el panel aparece solo si tu rol tiene acceso.</p>
      </aside>
    </div>
  );
}
