import Link from "next/link";

export const metadata = { title: "Sin acceso" };

export default function NoAccess() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-24 text-center sm:px-6">
      <div className="hex mx-auto size-16 bg-ember/20" />
      <h1 className="mt-6 text-3xl font-extrabold">Tu rol no tiene acceso a esta sección</h1>
      <p className="mt-3 text-fog">
        El panel staff es para los roles Reviewer y Admin del Discord. Si acabas de recibir el rol, cierra sesión y vuelve a
        entrar para que se actualice.
      </p>
      <Link href="/postular" className="btn-primary mt-8">
        Ir a postulaciones
      </Link>
    </div>
  );
}
