import Link from "next/link";
import { MARCA } from "@/config/marca";
import { Creditos } from "./Creditos";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-seam/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-fog sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()}{" "}
          <Link href="/" className="hover:text-bone">
            {MARCA.nombre}
          </Link>
        </p>
        <nav className="flex gap-5">
          <Link href="/terminos" className="hover:text-bone">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-bone">
            Privacidad
          </Link>
        </nav>
        {MARCA.avisoPie && <p>{MARCA.avisoPie}</p>}
      </div>
      <div className="border-t border-seam/50">
        <div className="mx-auto flex max-w-6xl justify-center px-4 py-4 sm:px-6">
          <Creditos />
        </div>
      </div>
    </footer>
  );
}
