import { requireViewer } from "@/lib/rbac";
import { FormBuilder } from "@/components/admin/FormBuilder";

export const metadata = { title: "Nuevo formulario" };

export default async function NewFormPage() {
  await requireViewer("admin", "/admin/formularios/nuevo");

  return (
    <div className="w-full min-w-0">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight break-words">
        Nuevo formulario
      </h1>
      <FormBuilder
        initial={{
          slug: "",
          title: "",
          tag: "",
          summary: "",
          intro: "",
          refPrefix: "",
          isOpen: false,
          closedNote: "",
          cooldownDays: "2",
          acceptedRoleId: "",
          requiredRoleId: "",
          position: "0",
          questions: [], // el editor añade una primera pregunta vacía
        }}
      />
    </div>
  );
}
