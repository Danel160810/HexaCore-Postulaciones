import { resolveMedia, type MediaKind } from "@/lib/media";

export function MediaEmbed({ kind, url, className = "" }: { kind: MediaKind | string; url?: string | null; className?: string }) {
  const media = resolveMedia(kind as MediaKind, url);
  if (!media) return null;

  if (media.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.src}
        alt="Imagen de la pregunta"
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`max-h-[420px] w-full rounded-lg border border-seam bg-slab object-contain ${className}`}
      />
    );
  }
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-lg border border-seam bg-slab ${className}`}>
      <iframe
        src={media.src}
        title={media.title}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
