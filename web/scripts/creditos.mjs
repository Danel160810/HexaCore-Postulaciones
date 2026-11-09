// Comprueba antes de compilar que los créditos del autor siguen en su sitio.
// Quitarlos incumple la licencia (LICENSE, cláusula 3). Cambiar nombre, logo y colores
// en src/config/marca.ts está permitido y no afecta a esta comprobación.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTOR = "HexaCore ft. Danel";
const DISCORD = "danel100816";

const checks = [
  ["src/config/creditos.ts", [AUTOR, DISCORD, "github.com/Danel160810/HexaCore-Postulaciones"]],
  ["src/components/Creditos.tsx", ["CREDITOS.autor", "CREDITOS.discord", "data-creditos"]],
  ["src/components/SiteFooter.tsx", ["<Creditos />"]],
  ["src/app/layout.tsx", ["CREDITOS.autor"]],
];
const licencia = [path.join(web, "..", "LICENSE"), path.join(web, "LICENSE")].find(existsSync);

const fallos = [];
if (!licencia || !readFileSync(licencia, "utf8").includes(AUTOR)) fallos.push("LICENSE");
for (const [file, needles] of checks) {
  const full = path.join(web, file);
  const src = existsSync(full) ? readFileSync(full, "utf8") : "";
  for (const n of needles) if (!src.includes(n)) fallos.push(`${file} (${n})`);
}

if (fallos.length) {
  console.error("\n✖ Faltan los créditos de HexaCore Postulaciones en:\n  - " + fallos.join("\n  - "));
  console.error("\n  La licencia permite cambiar nombre, logo y colores (src/config/marca.ts),");
  console.error(`  pero obliga a mantener visible "Creado por ${AUTOR}". Restaura los archivos originales.\n`);
  process.exit(1);
}
console.log(`✔ Créditos en su sitio · HexaCore Postulaciones · Creado por ${AUTOR}`);
