import { MARCA } from "@/config/marca";

export const metadata = { title: "Términos de uso" };

export default function Terms() {
  return (
    <article className="mx-auto max-w-[68ch] px-4 pt-14 pb-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Términos y Condiciones de Uso</h1>
      <p className="mt-2 text-sm text-fog/70">Última actualización: Octubre 2026</p>

      <div className="mt-8 space-y-6 text-fog leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">1. Aceptación de los Términos</h2>
          <p>
            Al registrarte, completar o enviar cualquier formulario de postulación o examen dentro del sitio web oficial de <strong>{MARCA.nombre}</strong>, declaras haber leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones. Si no estás de acuerdo con alguno de los puntos establecidos, debes abstenerte de utilizar esta plataforma.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">2. Proceso de Selección y Postulaciones</h2>
          <p>
            El envío de una postulación o la realización de los exámenes correspondientes <strong>no garantiza en ningún caso</strong> la obtención de un rango o puesto dentro del equipo del servidor. 
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>La administración de {MARCA.nombre} se reserva el derecho de admisión, aceptación o rechazo de cualquier aspirante de forma totalmente discrecional.</li>
            <li>El equipo no está obligado a brindar explicaciones detalladas o retroalimentación sobre el motivo exacto del rechazo de una postulación.</li>
            <li>Existe un periodo de espera obligatorio antes de poder enviar una nueva postulación en caso de ser rechazado.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">3. Reglas del Examen</h2>
          <p>
            Evaluamos la capacidad, criterio e integridad de cada candidato. Queda estrictamente prohibido:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>El uso de herramientas de Inteligencia Artificial para generar las respuestas de los exámenes.</li>
            <li>Copiar o plagiar respuestas de otros postulantes o sitios de internet.</li>
            <li>Proporcionar información falsa sobre tu identidad, edad, experiencia previa o historial de sanciones.</li>
            <li>Filtrar, capturar o compartir las preguntas y respuestas de las evaluaciones con terceros.</li>
          </ul>
          <p className="pt-1">
            El incumplimiento de cualquiera de estas normas provocará la <strong>descalificación inmediata</strong> del proceso y podrá acarrear sanciones o vetos (blacklist) permanentes tanto en la web como en el Discord de {MARCA.nombre}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">4. Tratamiento de Datos e Historial</h2>
          <p>
            Al enviar tus respuestas, autorizas a la administración de {MARCA.nombre} a almacenar, leer y conservar tu historial de postulaciones, dirección IP y datos de cuenta vinculados para fines administrativos, estadísticos y de seguridad interna. Tus datos no serán vendidos ni compartidos con terceros ajenos a la red.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">5. Exención de Responsabilidad</h2>
          <p>
            <strong>{MARCA.nombre}</strong> es una comunidad independiente. Las marcas de terceros que se mencionen (por ejemplo, Discord) pertenecen a sus dueños.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">6. Modificaciones de los Términos</h2>
          <p>
            Nos reservamos el derecho de actualizar o modificar estos términos en cualquier momento y sin previo aviso. Es responsabilidad del usuario revisar periódicamente esta sección antes de realizar un nuevo proceso de postulación.
          </p>
        </section>
      </div>
    </article>
  );
}
