-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('website', 'whatsapp', 'facebook', 'tiktok', 'google', 'call');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'scheduled', 'closed', 'lost');

-- CreateEnum
CREATE TYPE "FaqCategory" AS ENUM ('appointments', 'location', 'contact', 'treatments', 'pricing');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "interest" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'website',
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "pagePath" TEXT,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "imageAlt" TEXT,
    "icon" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedProblems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsappMessage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "imageAlt" TEXT,
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guidance" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaLabel" TEXT,
    "whatsappMessage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "photoAlt" TEXT,
    "role" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "treatmentType" TEXT NOT NULL,
    "rating" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "privacyNotice" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" "FaqCategory" NOT NULL DEFAULT 'treatments',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_active_order_idx" ON "Service"("active", "order");

-- CreateIndex
CREATE INDEX "Service_featured_order_idx" ON "Service"("featured", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentTopic_slug_key" ON "TreatmentTopic"("slug");

-- CreateIndex
CREATE INDEX "TreatmentTopic_active_order_idx" ON "TreatmentTopic"("active", "order");

-- CreateIndex
CREATE INDEX "TreatmentTopic_featured_order_idx" ON "TreatmentTopic"("featured", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_slug_key" ON "TeamMember"("slug");

-- CreateIndex
CREATE INDEX "TeamMember_active_order_idx" ON "TeamMember"("active", "order");

-- CreateIndex
CREATE INDEX "TeamMember_featured_order_idx" ON "TeamMember"("featured", "order");

-- CreateIndex
CREATE INDEX "Testimonial_active_order_idx" ON "Testimonial"("active", "order");

-- CreateIndex
CREATE INDEX "Testimonial_featured_order_idx" ON "Testimonial"("featured", "order");

-- CreateIndex
CREATE INDEX "Faq_active_order_idx" ON "Faq"("active", "order");

-- CreateIndex
CREATE INDEX "Faq_featured_order_idx" ON "Faq"("featured", "order");

-- CreateIndex
CREATE INDEX "Faq_category_order_idx" ON "Faq"("category", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE INDEX "SiteSetting_active_idx" ON "SiteSetting"("active");
