-- ═════════════════════════════════════════════════════════════
-- HexaCore Postulaciones — crear la base de datos
-- Creado por HexaCore ft. Danel (Discord: danel100816). Ver LICENSE.
-- Uso: Supabase → SQL Editor → New query → pega TODO este archivo → Run.
-- Es seguro ejecutarlo más de una vez (no borra nada).
-- Equivale a `npx prisma db push` + `npm run db:seed`.
-- ═════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) Tipos y tablas (idénticos a prisma/schema.prisma)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'TRUE_FALSE', 'SINGLE_CHOICE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MediaKind" AS ENUM ('NONE', 'IMAGE', 'YOUTUBE', 'VIMEO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "globalName" TEXT,
    "avatar" TEXT,
    "roles" TEXT[],
    "inGuild" BOOLEAN NOT NULL DEFAULT true,
    "rolesSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Form" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "intro" TEXT,
    "refPrefix" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "closedNote" TEXT,
    "cooldownDays" INTEGER NOT NULL DEFAULT 2,
    "acceptedRoleId" TEXT,
    "requiredRoleId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Form_slug_key" ON "Form"("slug");

CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "title" TEXT NOT NULL,
    "help" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "options" TEXT[],
    "correct" TEXT,
    "mediaKind" "MediaKind" NOT NULL DEFAULT 'NONE',
    "mediaUrl" TEXT,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Question_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Question_formId_position_idx" ON "Question"("formId", "position");

CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "answers" JSONB NOT NULL,
    "score" INTEGER,
    "maxScore" INTEGER,
    "decisionNote" TEXT,
    "reviewerId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "cooldownUntil" TIMESTAMP(3),
    "dmFailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Application_reference_key" ON "Application"("reference");
CREATE INDEX IF NOT EXISTS "Application_userId_status_idx" ON "Application"("userId", "status");
CREATE INDEX IF NOT EXISTS "Application_formId_status_idx" ON "Application"("formId", "status");
CREATE INDEX IF NOT EXISTS "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApplicationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");

CREATE TABLE IF NOT EXISTS "InternalComment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalComment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InternalComment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InternalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InternalComment_applicationId_createdAt_idx" ON "InternalComment"("applicationId", "createdAt");

CREATE TABLE IF NOT EXISTS "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- La web entra como dueña de las tablas; esto solo cierra la API pública de Supabase.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InternalComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutboxEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Counter" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2) Límite de intentos (anti spam / fuerza bruta) para la API
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key"         TEXT NOT NULL PRIMARY KEY,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count"       INT NOT NULL
);
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_hit(p_key TEXT, p_max INT, p_window_seconds INT) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    nowts TIMESTAMP(3) := (now() AT TIME ZONE 'utc');
    n INT;
    ws TIMESTAMP(3);
BEGIN
    -- Limpieza de vez en cuando (1 de cada 100 llamadas)
    IF random() < 0.01 THEN
        DELETE FROM "RateLimit" WHERE "windowStart" < nowts - INTERVAL '1 day';
    END IF;
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (p_key, nowts, 1)
    ON CONFLICT ("key") DO UPDATE SET
        "count"       = CASE WHEN "RateLimit"."windowStart" < nowts - make_interval(secs => p_window_seconds) THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" < nowts - make_interval(secs => p_window_seconds) THEN nowts ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart" INTO n, ws;
    IF n > p_max THEN
        RETURN greatest(1, ceil(extract(epoch FROM (ws + make_interval(secs => p_window_seconds) - nowts)))::int);
    END IF;
    RETURN 0;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3) Dos categorías de ejemplo (cerradas). Edítalas o bórralas desde /admin/formularios.
--    Si una ya existe (mismo slug), no se toca.
-- ─────────────────────────────────────────────────────────────

INSERT INTO "Form" ("id","slug","title","tag","summary","intro","refPrefix","isOpen","cooldownDays","position","updatedAt")
VALUES ('seed_staff', 'staff', 'Staff', 'Staff', 'Modera el chat, atiende dudas y ayuda a mantener la comunidad en orden.', 'Responde con calma y con tus propias palabras. Valoramos más la honestidad que las respuestas perfectas.', 'ST', false, 2, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Question" ("id","formId","position","type","title","required","minLength","maxLength","options","correct","mediaKind")
SELECT v.* FROM (VALUES
  ('seed_staff_q0', 'seed_staff', 0, 'SHORT_TEXT'::"QuestionType", '¿Qué edad tienes?', true, NULL::INTEGER, 150::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_staff_q1', 'seed_staff', 1, 'SHORT_TEXT'::"QuestionType", '¿Cuántas horas al día podrías dedicar a la comunidad?', true, NULL::INTEGER, 150::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_staff_q2', 'seed_staff', 2, 'LONG_TEXT'::"QuestionType", '¿Tienes experiencia moderando otras comunidades? Cuéntanos dónde y durante cuánto tiempo.', true, 20::INTEGER, 1500::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_staff_q3', 'seed_staff', 3, 'LONG_TEXT'::"QuestionType", 'Dos usuarios empiezan a discutir en el chat. ¿Cómo actúas paso a paso?', true, 20::INTEGER, 1500::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_staff_q4', 'seed_staff', 4, 'LONG_TEXT'::"QuestionType", 'Un amigo tuyo rompe las normas. ¿Qué haces?', true, 20::INTEGER, 1500::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_staff_q5', 'seed_staff', 5, 'TRUE_FALSE'::"QuestionType", 'Un miembro del staff puede sancionar sin pruebas si está seguro de lo que ha visto.', true, NULL::INTEGER, NULL::INTEGER, ARRAY[]::TEXT[], 'false', 'NONE'::"MediaKind"),
  ('seed_staff_q6', 'seed_staff', 6, 'LONG_TEXT'::"QuestionType", '¿Por qué quieres formar parte del staff?', true, 20::INTEGER, 1500::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_staff_q7', 'seed_staff', 7, 'SHORT_TEXT'::"QuestionType", '¿Cuál es tu zona horaria? (CET, GMT-3…)', true, NULL::INTEGER, 150::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind")
) AS v WHERE EXISTS (SELECT 1 FROM "Form" WHERE "id" = 'seed_staff') AND NOT EXISTS (SELECT 1 FROM "Question" WHERE "formId" = 'seed_staff');

INSERT INTO "Form" ("id","slug","title","tag","summary","intro","refPrefix","isOpen","cooldownDays","position","updatedAt")
VALUES ('seed_creador_de_contenido', 'creador-de-contenido', 'Creador de contenido', 'Media', 'Vídeos, directos y redes con el apoyo del equipo.', NULL, 'CC', false, 7, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Question" ("id","formId","position","type","title","required","minLength","maxLength","options","correct","mediaKind")
SELECT v.* FROM (VALUES
  ('seed_creador_de_contenido_q0', 'seed_creador_de_contenido', 0, 'SHORT_TEXT'::"QuestionType", '¿Qué edad tienes?', true, NULL::INTEGER, 150::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_creador_de_contenido_q1', 'seed_creador_de_contenido', 1, 'SHORT_TEXT'::"QuestionType", 'Enlace a tu canal o red principal', true, NULL::INTEGER, 150::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_creador_de_contenido_q2', 'seed_creador_de_contenido', 2, 'SHORT_TEXT'::"QuestionType", '¿Cuántos seguidores tienes aproximadamente?', true, NULL::INTEGER, 150::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_creador_de_contenido_q3', 'seed_creador_de_contenido', 3, 'LONG_TEXT'::"QuestionType", '¿Qué tipo de contenido haces?', true, 20::INTEGER, 1500::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_creador_de_contenido_q4', 'seed_creador_de_contenido', 4, 'LONG_TEXT'::"QuestionType", '¿Qué contenido harías para la comunidad?', true, 20::INTEGER, 1500::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind"),
  ('seed_creador_de_contenido_q5', 'seed_creador_de_contenido', 5, 'TRUE_FALSE'::"QuestionType", 'Me comprometo a publicar contenido al menos una vez por semana.', true, NULL::INTEGER, NULL::INTEGER, ARRAY[]::TEXT[], NULL, 'NONE'::"MediaKind")
) AS v WHERE EXISTS (SELECT 1 FROM "Form" WHERE "id" = 'seed_creador_de_contenido') AND NOT EXISTS (SELECT 1 FROM "Question" WHERE "formId" = 'seed_creador_de_contenido');

-- Comprobación: debería listar 2 categorías
SELECT "title", "isOpen", (SELECT count(*) FROM "Question" q WHERE q."formId" = f."id") AS preguntas FROM "Form" f ORDER BY "position";
