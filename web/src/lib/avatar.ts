/** URL del avatar de Discord (seguro para cliente y servidor). */
export function avatarUrl(id: string, avatar: string | null | undefined, size = 128) {
  if (avatar) {
    const ext = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=${size}`;
  }
  let index = 0;
  try {
    index = Number((BigInt(id) >> BigInt(22)) % BigInt(6));
  } catch {}
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
