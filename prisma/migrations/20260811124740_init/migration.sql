-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MAIN', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "nickname" TEXT,
    "imageUrl" TEXT,
    "weightKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT,
    "bodyPart" TEXT NOT NULL,
    "targetMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "equipment" TEXT,
    "mechanic" TEXT,
    "force" TEXT,
    "level" TEXT,
    "category" TEXT,
    "instructions" TEXT[],
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "defaultRestSec" INTEGER NOT NULL DEFAULT 90,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutinePreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutinePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetExercise" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ACCESSORY',
    "restSec" INTEGER,

    CONSTRAINT "PresetExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetSet" (
    "id" TEXT NOT NULL,
    "presetExerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,

    CONSTRAINT "PresetSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "presetId" TEXT NOT NULL,
    "memo" TEXT,
    "deferredFrom" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "presetId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "deferredFrom" DATE,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ACCESSORY',
    "restSec" INTEGER,

    CONSTRAINT "SessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "plannedWeight" DOUBLE PRECISION NOT NULL,
    "plannedReps" INTEGER NOT NULL,
    "actualWeight" DOUBLE PRECISION,
    "actualReps" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SessionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_sourceId_key" ON "Exercise"("sourceId");

-- CreateIndex
CREATE INDEX "Exercise_bodyPart_idx" ON "Exercise"("bodyPart");

-- CreateIndex
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");

-- CreateIndex
CREATE INDEX "RoutinePreset_userId_idx" ON "RoutinePreset"("userId");

-- CreateIndex
CREATE INDEX "PresetExercise_presetId_order_idx" ON "PresetExercise"("presetId", "order");

-- CreateIndex
CREATE INDEX "PresetSet_presetExerciseId_order_idx" ON "PresetSet"("presetExerciseId", "order");

-- CreateIndex
CREATE INDEX "PlannedDay_userId_date_idx" ON "PlannedDay"("userId", "date");

-- CreateIndex
CREATE INDEX "Session_userId_date_idx" ON "Session"("userId", "date");

-- CreateIndex
CREATE INDEX "SessionExercise_sessionId_order_idx" ON "SessionExercise"("sessionId", "order");

-- CreateIndex
CREATE INDEX "SessionSet_sessionExerciseId_order_idx" ON "SessionSet"("sessionExerciseId", "order");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutinePreset" ADD CONSTRAINT "RoutinePreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresetExercise" ADD CONSTRAINT "PresetExercise_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "RoutinePreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresetExercise" ADD CONSTRAINT "PresetExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresetSet" ADD CONSTRAINT "PresetSet_presetExerciseId_fkey" FOREIGN KEY ("presetExerciseId") REFERENCES "PresetExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedDay" ADD CONSTRAINT "PlannedDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedDay" ADD CONSTRAINT "PlannedDay_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "RoutinePreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "RoutinePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "SessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
