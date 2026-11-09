"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MARCA } from "@/config/marca";

export type LatticeCell = { slug: string; title: string; tag: string; isOpen: boolean };

const R = 62; // radio del hexágono (punta arriba)
const W = Math.sqrt(3) * R;
// Seis vecinos alrededor del centro
const RING = Array.from({ length: 6 }, (_, k) => {
  const a = ((60 * k - 30) * Math.PI) / 180;
  return { x: Math.cos(a) * (W + 8), y: Math.sin(a) * (W + 8) };
});

function hexPoints(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 90) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
}

/**
 * El panal: el logo en el centro y cada puesto del equipo alrededor.
 * Las celdas abiertas se iluminan; las cerradas quedan apagadas.
 */
const A = MARCA.colores.acento;
const S = MARCA.colores.superficie;
const B = MARCA.colores.borde;
const T = MARCA.colores.texto;
const TS = MARCA.colores.textoSuave;

export function HexLattice({ cells }: { cells: LatticeCell[] }) {
  const slots = RING.map((pos, i) => ({ pos, cell: cells[i] }));
  const pts = hexPoints(R);

  return (
    <svg viewBox="-250 -235 500 470" className="h-auto w-full max-w-[520px]" role="img" aria-label={`Puestos del equipo de ${MARCA.nombre}`}>
      <defs>
        <radialGradient id="lit" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={A} stopOpacity="0.32" />
          <stop offset="100%" stopColor={A} stopOpacity="0.06" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Centro: logo */}
      <motion.g initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.2, 0.9, 0.25, 1] }}>
        <polygon points={pts} fill={S} stroke={A} strokeOpacity="0.5" strokeWidth="1.5" />
        <image href={MARCA.logo} x={-38} y={-38} width={76} height={76} />
      </motion.g>

      {slots.map(({ pos, cell }, i) => {
        const delay = 0.25 + i * 0.08;
        const anim = {
          initial: { opacity: 0, x: 0, y: 0, scale: 0.7 },
          animate: { opacity: 1, x: pos.x, y: pos.y, scale: 1 },
          transition: { delay, type: "spring" as const, stiffness: 160, damping: 18 },
        };

        if (!cell) {
          return (
            <motion.g key={`empty-${i}`} {...anim}>
              <polygon points={pts} fill="none" stroke={B} strokeDasharray="4 6" />
            </motion.g>
          );
        }

        const body = (
          <>
            {cell.isOpen && <polygon points={pts} fill={A} opacity="0.25" filter="url(#glow)" />}
            <polygon
              points={pts}
              fill={cell.isOpen ? "url(#lit)" : S}
              stroke={cell.isOpen ? A : B}
              strokeWidth={cell.isOpen ? 1.6 : 1.2}
              className="transition-[fill-opacity] duration-200"
            />
            <text
              y={-6}
              textAnchor="middle"
              className="font-display"
              fontSize={cell.title.length > 12 ? 13 : 16}
              fontWeight={700}
              fill={cell.isOpen ? T : TS}
            >
              {cell.title.length > 18 ? cell.tag : cell.title}
            </text>
            <text y={16} textAnchor="middle" fontSize={11.5} fill={cell.isOpen ? A : TS}>
              {cell.isOpen ? "Abierta" : "Cerrada"}
            </text>
          </>
        );

        return (
          <motion.g key={cell.slug} {...anim} whileHover={cell.isOpen ? { scale: 1.06 } : undefined}>
            {cell.isOpen ? (
              <Link href={`/postular/${cell.slug}`} aria-label={`Postular a ${cell.title}`}>
                {body}
              </Link>
            ) : (
              body
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
