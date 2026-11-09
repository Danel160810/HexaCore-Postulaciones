"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";

export function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn-primary mt-7 w-full py-3.5 text-[15px]"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("discord", { callbackUrl });
      }}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
      {loading ? "Abriendo Discord…" : "Continuar con Discord"}
    </button>
  );
}
