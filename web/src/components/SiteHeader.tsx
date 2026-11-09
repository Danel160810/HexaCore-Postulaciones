import Link from "next/link";
import { getViewer } from "@/lib/rbac";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { UserMenu } from "./UserMenu";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-40 border-b border-seam/70 bg-bedrock/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo />
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
          <NavLink href="/postulaciones">Inicio</NavLink>
          {viewer && <NavLink href="/postular">Puestos</NavLink>}
          {viewer && (
            <>
            {viewer.isReviewer && <NavLink href="/admin">Panel staff</NavLink>}
            {viewer.isAdmin && <NavLink href="/admin/formularios">Formularios</NavLink>}
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center">
          {viewer ? (
            <UserMenu name={viewer.name} avatarUrl={viewer.avatarUrl} role={viewer.isAdmin ? "Admin" : viewer.isReviewer ? "Reviewer" : null} />
          ) : (
            <Link href="/login" className="btn-primary px-3.5 py-2">
              Entrar con Discord
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
