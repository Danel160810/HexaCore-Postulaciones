import { MARCA } from "@/config/marca";

export const metadata = { title: "Política de privacidad" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-[68ch] px-4 pt-14 pb-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-fog/70">Última actualización: Octubre 2026</p>

      <div className="mt-8 space-y-6 text-fog leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">1. Información que Recopilamos</h2>
          <p>
            Para gestionar las postulaciones y exámenes dentro de nuestra plataforma, recopilamos la siguiente información cuando te autenticas mediante OAuth2 con Discord:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Datos de cuenta de Discord:</strong> Identificador único (ID), nombre de usuario, foto de perfil (avatar) y los roles asignados a tu cuenta dentro del servidor de Discord de {MARCA.nombre}.</li>
            <li><strong>Información de postulaciones:</strong> Las respuestas enviadas en los formularios o evaluaciones, fechas de envío y actualizaciones de estado.</li>
          </ul>
          <p className="pt-1 text-sm text-fog/80">
            <em>Nota: No solicitamos tu correo electrónico ni tenemos acceso a tus mensajes privados o contraseña de Discord.</em>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">2. Uso de la Información</h2>
          <p>
            La información recopilada se utiliza exclusivamente para las siguientes finalidades internas:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Evaluar tu elegibilidad para incorporarte al equipo de trabajo de {MARCA.nombre}.</li>
            <li>Mantener un registro histórico de tus evaluaciones y solicitudes previas.</li>
            <li>Verificar la autenticidad de las respuestas y prevenir el plagio o el uso de multicuentas.</li>
            <li>Asignar roles automáticos en nuestro servidor de Discord en caso de aprobación.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">3. Acceso y Confidencialidad de los Datos</h2>
          <p>
            Tus datos no serán vendidos, cedidos ni compartidos con ningún tercero ajeno a la red. El acceso a tus respuestas está estrictamente restringido al personal autorizado del equipo de {MARCA.nombre} (roles de <strong>Reviewer</strong>, <strong>Administrador</strong> o superior).
          </p>
          <p>
            Las notas internas, comentarios de revisión y puntuaciones asignadas por los evaluadores son de carácter confidencial y pertenecen al registro exclusivo de la administración.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">4. Conservación y Eliminación de Datos</h2>
          <p>
            Conservamos tus registros en nuestro sistema para garantizar la transparencia del proceso de selección e impedir que aspirantes rechazados omitan el tiempo de espera obligatorio.
          </p>
          <p>
            Si deseas ejercer tu derecho a la rectificación o eliminación total de tus datos personales e historial de postulaciones de nuestra base de datos, puedes solicitarlo directamente abriendo un ticket de soporte en nuestro servidor oficial de Discord.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">5. Cookies y Almacenamiento Local</h2>
          <p>
            Utilizamos sesiones seguras e identificadores de almacenamiento local estrictamente necesarios para mantener tu sesión activa durante el uso del sitio web y garantizar la seguridad de tus respuestas durante la realización del examen.
          </p>
        </section>
      </div>
    </article>
  );
}
