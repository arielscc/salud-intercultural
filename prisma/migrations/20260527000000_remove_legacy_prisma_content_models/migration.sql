-- Drop legacy Prisma content tables after moving active ownership to Payload.
DROP TABLE IF EXISTS "Lead";
DROP TABLE IF EXISTS "Service";
DROP TABLE IF EXISTS "TreatmentTopic";
DROP TABLE IF EXISTS "TeamMember";
DROP TABLE IF EXISTS "Testimonial";
DROP TABLE IF EXISTS "Faq";
DROP TABLE IF EXISTS "SiteSetting";

DROP TYPE IF EXISTS "LeadSource";
DROP TYPE IF EXISTS "LeadStatus";
DROP TYPE IF EXISTS "FaqCategory";
