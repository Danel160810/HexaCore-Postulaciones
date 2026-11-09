"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  // "/admin" no debe marcarse activo dentro de "/admin/formularios"
  const active =
    href === "/admin"
      ? path === "/admin" || path.startsWith("/admin/postulaciones")
      : path === href || path.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`relative shrink-0 rounded-md px-3 py-1.5 transition-colors ${active ? "text-bone" : "text-fog hover:text-bone"}`}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 -z-10 rounded-md border border-seam bg-slab"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      {children}
    </Link>
  );
}
