// Utilidades de medios para preguntas (cliente y servidor).
export type MediaKind = "NONE" | "IMAGE" | "YOUTUBE" | "VIMEO";

export type ResolvedMedia =
  | { kind: "image"; src: string }
  | { kind: "iframe"; src: string; title: string }
  | null;

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return clean(u.pathname.slice(1));
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return clean(u.searchParams.get("v")!);
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
      if (m) return clean(m[1]);
    }
  } catch {}
  return null;
}

export function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    const m = u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function clean(id: string) {
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function isHttpsUrl(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveMedia(kind: MediaKind, url: string | null | undefined): ResolvedMedia {
  if (!url || kind === "NONE") return null;
  if (kind === "IMAGE") return isHttpsUrl(url) ? { kind: "image", src: url } : null;
  if (kind === "YOUTUBE") {
    const id = youtubeId(url);
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, title: "Vídeo de YouTube" } : null;
  }
  if (kind === "VIMEO") {
    const id = vimeoId(url);
    return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}?dnt=1`, title: "Vídeo de Vimeo" } : null;
  }
  return null;
}
