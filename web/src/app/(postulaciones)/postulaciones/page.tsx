import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/rbac";
import { HexLattice } from "@/components/HexLattice";
import { MARCA } from "@/config/marca";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Postulaciones",
  description: MARCA.descripcion,
  alternates: { canonical: "/postulaciones" },
};

const STEPS = [
  { title: "Entra con Discord", text: "Leemos tu nombre y tus roles del servidor. No publicamos nada en tu nombre." },
  { title: "Responde el examen", text: "Una pregunta cada vez. Tu borrador se guarda solo por si cierras la pestaña." },
  { title: "Recibe la respuesta por MD", text: `El bot de ${MARCA.nombre} te escribe en cada cambio de estado, y lo ves también aquí.` },
];

export default async function PostulacionesHome() {
  const [viewer, forms] = await Promise.all([
    getViewer(),
    prisma.form.findMany({
      where: { archived: false },
      orderBy: [{ isOpen: "desc" }, { position: "asc" }],
      select: { slug: true, title: true, tag: true, isOpen: true },
      take: 6,
    }),
  ]);
  const openCount = forms.filter((f) => f.isOpen).length;

  return (
    <div className="honeycomb">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-seam bg-deepslate px-3 py-1 text-sm text-fog">
            <span className={`size-2 rounded-full ${openCount ? "bg-acento shadow-[0_0_10px_var(--color-acento)]" : "bg-fog/50"}`} />
            {openCount === 0
              ? "Ahora mismo no hay puestos abiertos"
              : openCount === 1
                ? "1 puesto abierto ahora mismo"
                : `${openCount} puestos abiertos ahora mismo`}
          </p>
          <h1 className="text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.95] font-extrabold">
            {MARCA.portada.titulo}
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg text-fog">
            {MARCA.portada.texto}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {viewer ? (
              <Link href="/postular" className="btn-primary px-5 py-3 text-[15px]">
                Ver puestos
              </Link>
            ) : (
              <Link href="/login" className="btn-primary px-5 py-3 text-[15px]">
                Entrar con Discord
              </Link>
            )}
            {viewer?.isReviewer && (
              <Link href="/admin" className="btn-ghost px-5 py-3 text-[15px]">
                Abrir panel staff
              </Link>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <HexLattice cells={forms} />
        </div>
      </section>

      <section className="border-t border-seam/70 bg-deepslate/60">
        <ol className="mx-auto grid max-w-6xl gap-px px-4 sm:px-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="py-10 md:pr-10">
              <span className="font-mono text-sm text-acento">Paso {i + 1}</span>
              <h2 className="mt-2 text-xl font-bold">{s.title}</h2>
              <p className="mt-2 max-w-[38ch] text-fog">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
