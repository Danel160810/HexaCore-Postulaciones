import { requireViewer } from "@/lib/rbac";

// Todo /admin exige rol Reviewer o Admin (comprobado en cada petición).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("reviewer", "/admin");

  return (
    <div className="mx-auto max-w-6xl w-full min-w-0 overflow-x-hidden px-4 pt-10 sm:px-6">
      {children}
    </div>
  );
}
