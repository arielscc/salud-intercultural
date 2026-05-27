import "dotenv/config";
import { prisma } from "../src/modules/database/client";
import { faqs } from "../src/data/faqs";
import { problems } from "../src/data/problems";
import { services } from "../src/data/services";
import { teamMembers } from "../src/data/team";
import { testimonials } from "../src/data/testimonials";
import { clinic } from "../src/data/clinic";
import { treatmentsContent } from "../src/data/treatments";

/*
 * Seed legacy de contenido Prisma.
 *
 * Payload es la fuente de verdad para contenido editable y leads simples.
 * Este archivo se conserva temporalmente solo para revisar o mantener datos
 * legacy antes de eliminar los modelos Prisma editoriales.
 */

async function seedServices() {
  await Promise.all(
    services.map((service, index) =>
      prisma.service.upsert({
        where: { slug: service.slug },
        create: {
          slug: service.slug,
          title: service.title,
          description: service.description,
          image: service.image,
          imageAlt: service.imageAlt,
          icon: service.icon,
          benefits: service.benefits,
          relatedProblems: service.relatedProblems,
          whatsappMessage: service.whatsappMessage,
          active: service.active,
          featured: service.featured,
          order: index + 1,
          seoTitle: service.seo.title,
          seoDescription: service.seo.description
        },
        update: {
          title: service.title,
          description: service.description,
          image: service.image,
          imageAlt: service.imageAlt,
          icon: service.icon,
          benefits: service.benefits,
          relatedProblems: service.relatedProblems,
          whatsappMessage: service.whatsappMessage,
          active: service.active,
          featured: service.featured,
          order: index + 1,
          seoTitle: service.seo.title,
          seoDescription: service.seo.description
        }
      })
    )
  );
}

async function seedTreatmentTopics() {
  await Promise.all(
    problems.map((problem, index) =>
      prisma.treatmentTopic.upsert({
        where: { slug: problem.title.toLowerCase().replace(/\s+/g, "-") },
        create: {
          slug: problem.title.toLowerCase().replace(/\s+/g, "-"),
          title: problem.title,
          summary: problem.headline,
          description: problem.description,
          guidance: [problem.cta],
          whatsappMessage: problem.whatsappMessage,
          active: true,
          featured: index < 3,
          order: index + 1,
          seoTitle: `${problem.title} | Salud Intercultural`,
          seoDescription: problem.description
        },
        update: {
          title: problem.title,
          summary: problem.headline,
          description: problem.description,
          guidance: [problem.cta],
          whatsappMessage: problem.whatsappMessage,
          active: true,
          featured: index < 3,
          order: index + 1,
          seoTitle: `${problem.title} | Salud Intercultural`,
          seoDescription: problem.description
        }
      })
    )
  );
}

async function seedTeamMembers() {
  await Promise.all(
    teamMembers.map((member) =>
      prisma.teamMember.upsert({
        where: { slug: member.slug },
        create: {
          slug: member.slug,
          name: member.name,
          photo: member.photo,
          photoAlt: member.photoAlt,
          role: member.role,
          specialty: member.specialty,
          description: member.description,
          credentials: member.credentials,
          focusAreas: member.focusAreas,
          active: member.active,
          featured: member.featured,
          order: member.order,
          seoTitle: `${member.name} | Salud Intercultural`,
          seoDescription: member.description
        },
        update: {
          name: member.name,
          photo: member.photo,
          photoAlt: member.photoAlt,
          role: member.role,
          specialty: member.specialty,
          description: member.description,
          credentials: member.credentials,
          focusAreas: member.focusAreas,
          active: member.active,
          featured: member.featured,
          order: member.order,
          seoTitle: `${member.name} | Salud Intercultural`,
          seoDescription: member.description
        }
      })
    )
  );
}

async function seedTestimonials() {
  await Promise.all(
    testimonials.map((testimonial) =>
      prisma.testimonial.upsert({
        where: { id: testimonial.id },
        create: {
          id: testimonial.id,
          author: testimonial.author,
          quote: testimonial.quote,
          treatmentType: testimonial.treatmentType,
          rating: testimonial.rating,
          publishedAt: testimonial.date ? new Date(`${testimonial.date}T00:00:00`) : undefined,
          privacyNotice: testimonial.privacyNotice,
          active: testimonial.active,
          featured: testimonial.featured,
          order: testimonial.order
        },
        update: {
          author: testimonial.author,
          quote: testimonial.quote,
          treatmentType: testimonial.treatmentType,
          rating: testimonial.rating,
          publishedAt: testimonial.date ? new Date(`${testimonial.date}T00:00:00`) : null,
          privacyNotice: testimonial.privacyNotice,
          active: testimonial.active,
          featured: testimonial.featured,
          order: testimonial.order
        }
      })
    )
  );
}

async function seedFaqs() {
  await Promise.all(
    faqs.map((faq) =>
      prisma.faq.upsert({
        where: { id: faq.id },
        create: {
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          active: faq.active,
          featured: faq.featured,
          order: faq.order,
          seoTitle: `${faq.question} | Salud Intercultural`,
          seoDescription: faq.answer
        },
        update: {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          active: faq.active,
          featured: faq.featured,
          order: faq.order,
          seoTitle: `${faq.question} | Salud Intercultural`,
          seoDescription: faq.answer
        }
      })
    )
  );
}

async function seedSettings() {
  await prisma.siteSetting.upsert({
    where: { key: "clinic" },
    create: {
      key: "clinic",
      name: "Configuración institucional",
      value: clinic,
      description: "Datos de contacto, ubicación y redes sociales de la clínica.",
      active: true
    },
    update: {
      name: "Configuración institucional",
      value: clinic,
      description: "Datos de contacto, ubicación y redes sociales de la clínica.",
      active: true
    }
  });

  await prisma.siteSetting.upsert({
    where: { key: "treatments-page" },
    create: {
      key: "treatments-page",
      name: "Contenido página tratamientos",
      value: treatmentsContent,
      description: "Bloques base de la página general de tratamientos.",
      active: true,
      seoTitle: treatmentsContent.seo.title,
      seoDescription: treatmentsContent.seo.description
    },
    update: {
      name: "Contenido página tratamientos",
      value: treatmentsContent,
      description: "Bloques base de la página general de tratamientos.",
      active: true,
      seoTitle: treatmentsContent.seo.title,
      seoDescription: treatmentsContent.seo.description
    }
  });
}

async function main() {
  await seedServices();
  await seedTreatmentTopics();
  await seedTeamMembers();
  await seedTestimonials();
  await seedFaqs();
  await seedSettings();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
