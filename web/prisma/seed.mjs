// Crea dos categorías de ejemplo (cerradas) para que veas cómo funciona. Edítalas o bórralas desde /admin/formularios.
// Ejecuta: npm run db:seed   (no sobrescribe formularios que ya existan)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const S = (title, extra = {}) => ({ type: "SHORT_TEXT", title, maxLength: 150, ...extra });
const L = (title, extra = {}) => ({ type: "LONG_TEXT", title, maxLength: 1500, minLength: 20, ...extra });
const TF = (title, correct = null, extra = {}) => ({ type: "TRUE_FALSE", title, correct, ...extra });

const FORMS = [
  {
    slug: "staff",
    title: "Staff",
    tag: "Staff",
    refPrefix: "ST",
    summary: "Modera el chat, atiende dudas y ayuda a mantener la comunidad en orden.",
    intro: "Responde con calma y con tus propias palabras. Valoramos más la honestidad que las respuestas perfectas.",
    cooldownDays: 2,
    position: 0,
    questions: [
      S("¿Qué edad tienes?"),
      S("¿Cuántas horas al día podrías dedicar a la comunidad?"),
      L("¿Tienes experiencia moderando otras comunidades? Cuéntanos dónde y durante cuánto tiempo."),
      L("Dos usuarios empiezan a discutir en el chat. ¿Cómo actúas paso a paso?"),
      L("Un amigo tuyo rompe las normas. ¿Qué haces?"),
      TF("Un miembro del staff puede sancionar sin pruebas si está seguro de lo que ha visto.", "false"),
      L("¿Por qué quieres formar parte del staff?"),
      S("¿Cuál es tu zona horaria? (CET, GMT-3…)"),
    ],
  },
  {
    slug: "creador-de-contenido",
    title: "Creador de contenido",
    tag: "Media",
    refPrefix: "CC",
    summary: "Vídeos, directos y redes con el apoyo del equipo.",
    cooldownDays: 7,
    position: 1,
    questions: [
      S("¿Qué edad tienes?"),
      S("Enlace a tu canal o red principal"),
      S("¿Cuántos seguidores tienes aproximadamente?"),
      L("¿Qué tipo de contenido haces?"),
      L("¿Qué contenido harías para la comunidad?"),
      TF("Me comprometo a publicar contenido al menos una vez por semana.", null),
    ],
  },
];

async function main() {
  for (const { questions, ...form } of FORMS) {
    const exists = await prisma.form.findUnique({ where: { slug: form.slug } });
    if (exists) {
      console.log(`· ${form.title}: ya existe, no se toca`);
      continue;
    }
    await prisma.form.create({
      data: {
        ...form,
        isOpen: false,
        questions: {
          create: questions.map((q, i) => ({
            position: i,
            required: true,
            options: [],
            mediaKind: "NONE",
            ...q,
          })),
        },
      },
    });
    console.log(`✓ ${form.title}: creado (${questions.length} preguntas, cerrado)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
