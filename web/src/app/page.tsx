import { redirect } from "next/navigation";

// La portada del sistema es /postulaciones
export default function Home() {
  redirect("/postulaciones");
}
