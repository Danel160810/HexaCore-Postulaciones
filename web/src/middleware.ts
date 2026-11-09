import { withAuth } from "next-auth/middleware";

// Primera barrera: sin sesión no se entra a estas rutas.
// Los permisos por rol se comprueban en el servidor de cada página/API (src/lib/rbac.ts).
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // "/postulaciones" (la portada) es pública; "/postulaciones/<id>" necesita sesión.
  matcher: ["/postular/:path*", "/postulaciones/:path+", "/admin/:path*"],
};
