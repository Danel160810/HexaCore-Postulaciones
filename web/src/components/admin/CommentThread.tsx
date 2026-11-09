"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { avatarUrl } from "@/lib/avatar";

type Comment = { id: string; body: string; createdAt: string; author: { name: string; avatarUrl: string } };

export function CommentThread({ applicationId, initial }: { applicationId: string; initial: Comment[] }) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/applications/${applicationId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "No se pudo guardar la nota.");
    const c = data.comment;
    setComments((list) => [
      ...list,
      {
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        author: { name: c.author.globalName || c.author.username, avatarUrl: avatarUrl(c.author.id, c.author.avatar, 64) },
      },
    ]);
    setBody("");
  }

  return (
    <div className="mt-5">
      {comments.length === 0 && <p className="text-sm text-fog">Todavía no hay notas. Deja la primera para el resto del equipo.</p>}
      <ul className="space-y-4">
        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <motion.li key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.author.avatarUrl} alt="" className="hex size-8 shrink-0 bg-slab" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{c.author.name}</span>{" "}
                  <span className="text-xs text-fog">{fmtDateTime(c.createdAt)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-bone/90">{c.body}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="comment" className="sr-only">
          Nueva nota interna
        </label>
        <textarea
          id="comment"
          className="field min-h-20 text-sm"
          placeholder="Escribe una nota para el equipo…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
        />
        <div className="flex items-center justify-between gap-3">
          {error ? <p className="text-sm text-ember">{error}</p> : <span className="text-xs text-fog">Ctrl + Enter para guardar</span>}
          <button className="btn-ghost" onClick={send} disabled={loading || !body.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Guardar nota
          </button>
        </div>
      </div>
    </div>
  );
}
