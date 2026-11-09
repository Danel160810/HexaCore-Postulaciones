import Image from "next/image";
import Link from "next/link";
import { MARCA } from "@/config/marca";

export function Logo({ size = 34 }: { size?: number }) {
  const [a, b] = MARCA.nombrePartes;
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={`${MARCA.nombre}, inicio`}>
      <Image
        src={MARCA.logo}
        alt=""
        width={size}
        height={size}
        priority
        className="transition-transform duration-300 group-hover:rotate-[30deg]"
      />
      <span className="font-display text-[17px] font-bold tracking-tight">
        {a}
        {b && <span className="text-acento">{b}</span>}
      </span>
    </Link>
  );
}
