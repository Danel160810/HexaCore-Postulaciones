"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function UserMenu({ name, avatarUrl, role }: { name: string; avatarUrl: string; role: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden text-right leading-tight sm:block">
        <div className="max-w-40 truncate text-sm font-medium">{name}</div>
        {role && <div className="text-xs text-acento">{role}</div>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl} alt="" width={34} height={34} className="hex size-[34px] bg-slab object-cover" />
      <button
        onClick={() => signOut({ callbackUrl: "/postulaciones" })}
        className="btn-ghost ml-1 px-2.5 py-2"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
