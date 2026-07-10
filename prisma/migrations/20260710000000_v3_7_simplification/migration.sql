-- CreateEnum
CREATE TYPE "FollowUpContactPreference" AS ENUM ('whatsapp', 'call', 'both', 'no_contact', 'unknown');

-- CreateEnum
CREATE TYPE "VisitIntakeType" AS ENUM ('first_visit', 'treatment_control', 'new_problem', 'results_review');

-- CreateEnum
CREATE TYPE "SymptomDurationUnit" AS ENUM ('days', 'weeks', 'months', 'years');

-- AlterEnum
ALTER TYPE "InternalRole" ADD VALUE 'seguimiento';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "currentMedication" TEXT,
ADD COLUMN     "followUpPreference" "FollowUpContactPreference" NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "bringsStudies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intakeType" "VisitIntakeType" NOT NULL DEFAULT 'first_visit',
ADD COLUMN     "previouslyTreated" BOOLEAN,
ADD COLUMN     "symptomDurationUnit" "SymptomDurationUnit",
ADD COLUMN     "symptomDurationValue" INTEGER;
