import { CREDITOS } from "@/config/creditos";

/**
 * Línea de créditos del pie. Obligatoria por la licencia (LICENSE, cláusula 3):
 * debe verse en todas las páginas, sin ocultarla ni cambiar su texto.
 */
export function Creditos() {
  return (
    <p className="text-xs text-fog" data-creditos="hexacore">
      Creado por{" "}
      <a href={CREDITOS.repositorio} target="_blank" rel="noopener" className="font-semibold text-bone hover:text-acento">
        {CREDITOS.autor}
      </a>{" "}
      · Discord: <span className="font-mono text-bone">{CREDITOS.discord}</span>
    </p>
  );
}
