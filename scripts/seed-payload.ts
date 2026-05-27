import "dotenv/config";
import config from "@payload-config";
import { getPayload } from "payload";
import { siteConfig } from "../src/config/site";
import { aboutContent } from "../src/data/about";
import { faqs } from "../src/data/faqs";
import { homeContent } from "../src/data/home";
import { problems } from "../src/data/problems";
import { services } from "../src/data/services";
import { teamMembers } from "../src/data/team";
import { testimonials } from "../src/data/testimonials";
import { treatmentsContent } from "../src/data/treatments";
import { seo } from "../src/lib/seo";

type PayloadClient = Awaited<ReturnType<typeof getPayload>>;
type SeededServiceDoc = {
  id: number;
  slug?: string | null;
};

type PageSeed = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  hero?: {
    eyebrow?: string;
    imageUrl?: string;
    imageAlt?: string;
  };
  seo: {
    title: string;
    description: string;
  };
  order: number;
};

const pageSeeds: PageSeed[] = [
  {
    slug: "home",
    title: seo.title,
    summary: seo.description,
    content: "Página principal con hero, servicios destacados, testimonios, FAQs y contacto.",
    seo: {
      title: seo.title,
      description: seo.description
    },
    order: 1
  },
  {
    slug: "servicios",
    title: "Servicios de medicina natural e integrativa",
    summary:
      "Listado de servicios principales de Salud Intercultural en El Alto.",
    content:
      "Servicios editables con imagen, beneficios, problemas relacionados, CTA y SEO.",
    seo: {
      title: "Servicios de medicina natural e integrativa | Salud Intercultural",
      description:
        "Conoce los servicios principales de Salud Intercultural: consulta médica, sueroterapia, ozonoterapia, terapias complementarias y tratamientos naturales personalizados en El Alto."
    },
    order: 2
  },
  {
    slug: "nosotros",
    title: aboutContent.hero.title,
    summary: aboutContent.hero.description,
    content: aboutContent.history.paragraphs.join("\n\n"),
    hero: {
      eyebrow: aboutContent.hero.eyebrow,
      imageUrl: aboutContent.hero.image,
      imageAlt: aboutContent.hero.imageAlt
    },
    seo: aboutContent.seo,
    order: 3
  },
  {
    slug: "tratamientos",
    title: treatmentsContent.hero.title,
    summary: treatmentsContent.hero.description,
    content: treatmentsContent.overview.paragraphs.join("\n\n"),
    hero: {
      eyebrow: treatmentsContent.hero.eyebrow
    },
    seo: treatmentsContent.seo,
    order: 4
  },
  {
    slug: "equipo",
    title: "Equipo médico",
    summary:
      "Perfiles profesionales activos administrables desde el panel.",
    content:
      "Equipo profesional preparado para fotos, cargo, especialidad, descripción, estado y orden.",
    seo: {
      title: "Equipo médico | Salud Intercultural",
      description:
        "Conoce al equipo médico de Salud Intercultural: perfiles profesionales activos administrables desde el panel."
    },
    order: 5
  },
  {
    slug: "testimonios",
    title: "Testimonios de pacientes",
    summary:
      "Experiencias publicadas con privacidad y comunicación responsable.",
    content:
      "Testimonios administrables con autor, motivo de consulta, rating y fecha opcional.",
    seo: {
      title: "Testimonios de pacientes | Salud Intercultural",
      description:
        "Experiencias de pacientes de Salud Intercultural con identidad reservada, motivo de consulta y valoración opcional."
    },
    order: 6
  },
  {
    slug: "preguntas-frecuentes",
    title: "Preguntas frecuentes",
    summary:
      "Dudas frecuentes sobre citas, ubicación, contacto, tratamientos y costos.",
    content:
      "Preguntas frecuentes administrables por categoría, estado destacado y orden.",
    seo: {
      title: "Preguntas frecuentes | Salud Intercultural",
      description:
        "Resuelve dudas frecuentes sobre citas, ubicación, WhatsApp, llamadas, tratamientos personalizados, costos y atención en Salud Intercultural."
    },
    order: 7
  },
  {
    slug: "contacto",
    title: "Contacto",
    summary:
      "Canales oficiales, dirección, horarios, mapa y formulario principal.",
    content:
      "Página de contacto conectada con formulario de leads, WhatsApp y llamada.",
    seo: {
      title: "Contacto | Salud Intercultural",
      description:
        "Contacta a Salud Intercultural por WhatsApp, llamada o formulario. Encuentra dirección, horarios, mapa y canales oficiales en El Alto."
    },
    order: 8
  }
];

function textRows(items: readonly string[]) {
  return items.map((text) => ({ text }));
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function seoData(seo: { title?: string; description?: string }) {
  return {
    ...seo,
    title: seo.title ? limitText(seo.title, 70) : undefined,
    description: seo.description ? limitText(seo.description, 170) : undefined
  };
}

async function upsertBySlug<T extends Record<string, unknown>>(
  payload: PayloadClient,
  collection: "pages" | "services" | "team-members" | "testimonials" | "treatment-topics",
  slug: string,
  data: T
) {
  const existing = await payload.find({
    collection,
    limit: 1,
    overrideAccess: true,
    where: {
      slug: {
        equals: slug
      }
    }
  });

  if (existing.docs[0]) {
    return payload.update({
      collection,
      id: existing.docs[0].id,
      data,
      overrideAccess: true
    });
  }

  return payload.create({
    collection,
    data,
    overrideAccess: true
  } as never);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function upsertFaq(payload: PayloadClient, faq: (typeof faqs)[number]) {
  const existing = await payload.find({
    collection: "faqs",
    limit: 1,
    overrideAccess: true,
    where: {
      question: {
        equals: faq.question
      }
    }
  });
  const data = {
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    active: faq.active,
    featured: faq.featured,
    order: faq.order,
    seo: seoData({
      title: `${faq.question} | Salud Intercultural`,
      description: faq.answer
    })
  };

  if (existing.docs[0]) {
    return payload.update({
      collection: "faqs",
      id: existing.docs[0].id,
      data,
      overrideAccess: true
    });
  }

  return payload.create({
    collection: "faqs",
    data,
    overrideAccess: true
  });
}

async function seedAdmin(payload: PayloadClient) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const shouldResetPassword = process.env.ADMIN_RESET_PASSWORD_ON_SEED === "true";

  if (!email || !password) {
    return;
  }

  const existing = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
    where: {
      email: {
        equals: email
      }
    }
  });

  if (existing.docs[0]) {
    await payload.update({
      collection: "users",
      id: existing.docs[0].id,
      data: {
        name: "Administrador Salud Intercultural",
        ...(shouldResetPassword ? { password } : {}),
        role: "admin"
      },
      overrideAccess: true
    });
    return;
  }

  await payload.create({
    collection: "users",
    data: {
      email,
      password,
      name: "Administrador Salud Intercultural",
      role: "admin"
    },
    overrideAccess: true
  });
}

async function seedServices(payload: PayloadClient) {
  const seeded: SeededServiceDoc[] = [];

  for (const [index, service] of services.entries()) {
    const doc = await upsertBySlug(payload, "services", service.slug, {
      slug: service.slug,
      title: service.title,
      description: service.description,
      imageUrl: service.image,
      imageAlt: service.imageAlt,
      icon: service.icon,
      benefits: textRows(service.benefits),
      relatedProblems: textRows(service.relatedProblems),
      whatsappMessage: service.whatsappMessage,
      active: service.active,
      featured: service.featured,
      order: index + 1,
      seo: seoData(service.seo)
    });
    seeded.push(doc as SeededServiceDoc);
  }

  return seeded;
}

async function seedTeamMembers(payload: PayloadClient) {
  for (const member of teamMembers) {
    await upsertBySlug(payload, "team-members", member.slug, {
      slug: member.slug,
      name: member.name,
      imageUrl: member.photo,
      imageAlt: member.photoAlt,
      role: member.role,
      specialty: member.specialty,
      description: member.description,
      credentials: textRows(member.credentials),
      focusAreas: textRows(member.focusAreas),
      active: member.active,
      featured: member.featured,
      order: member.order,
      seo: seoData({
        title: `${member.name} | Salud Intercultural`,
        description: member.description
      })
    });
  }
}

async function seedTestimonials(payload: PayloadClient) {
  for (const testimonial of testimonials) {
    await upsertBySlug(payload, "testimonials", testimonial.id, {
      slug: testimonial.id,
      author: testimonial.author,
      quote: testimonial.quote,
      treatmentType: testimonial.treatmentType,
      rating: testimonial.rating,
      publishedAt: testimonial.date,
      privacyNotice: testimonial.privacyNotice,
      active: testimonial.active,
      featured: testimonial.featured,
      order: testimonial.order,
      seo: seoData({
        title: `${testimonial.treatmentType} | Salud Intercultural`,
        description: testimonial.quote
      })
    });
  }
}

async function seedFaqs(payload: PayloadClient) {
  for (const faq of faqs) {
    await upsertFaq(payload, faq);
  }
}

async function seedTreatmentTopics(payload: PayloadClient) {
  for (const [index, problem] of problems.entries()) {
    await upsertBySlug(payload, "treatment-topics", slugify(problem.title), {
      slug: slugify(problem.title),
      title: problem.title,
      headline: problem.headline,
      description: problem.description,
      cta: problem.cta,
      whatsappMessage: problem.whatsappMessage,
      icon: problem.icon,
      active: true,
      featured: index < 3,
      order: index + 1,
      seo: seoData({
        title: `${problem.title} | Salud Intercultural`,
        description: problem.description
      })
    });
  }
}

async function seedPages(payload: PayloadClient) {
  for (const page of pageSeeds) {
    await upsertBySlug(payload, "pages", page.slug, {
      slug: page.slug,
      title: page.title,
      summary: page.summary,
      hero: {
        eyebrow: page.hero?.eyebrow ?? (page.slug === "home" ? "Inicio" : page.title),
        imageUrl: page.hero?.imageUrl ?? services[0]?.image,
        imageAlt: page.hero?.imageAlt ?? services[0]?.imageAlt
      },
      content: page.content,
      active: true,
      featured: page.slug === "home",
      order: page.order,
      seo: seoData(page.seo)
    });
  }
}

async function seedGlobals(payload: PayloadClient, serviceDocs: SeededServiceDoc[]) {
  const featuredServiceIds = homeContent.featuredServiceSlugs
    .map((slug) => serviceDocs.find((service) => service.slug === slug)?.id)
    .filter((id): id is number => typeof id === "number");

  await payload.updateGlobal({
    slug: "site-settings",
    data: {
      brand: {
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        slogan: siteConfig.slogan,
        description: siteConfig.description
      },
      contact: siteConfig.contact,
      conversion: siteConfig.conversion,
      social: siteConfig.social,
      seo: {
        title: limitText(seo.title, 70),
        description: limitText(seo.description, 170),
        keywords: seo.keywords.map((keyword) => ({ keyword }))
      }
    },
    overrideAccess: true
  });

  await payload.updateGlobal({
    slug: "home-content",
    data: {
      hero: {
        eyebrow: homeContent.hero.eyebrow.map((text) => ({ text })),
        title: homeContent.hero.title,
        description: homeContent.hero.description,
        primaryCta: homeContent.hero.primaryCta,
        secondaryCta: homeContent.hero.secondaryCta,
        trustNote: homeContent.hero.trustNote
      },
      stats: homeContent.stats.map((stat) => ({ ...stat })),
      featuredServices: featuredServiceIds,
      featuredVideo: homeContent.featuredVideo,
      editableBlocks: homeContent.editableBlocks.map((block) => ({ ...block })),
      seo: {
        title: limitText(seo.title, 70),
        description: limitText(seo.description, 170),
        keywords: seo.keywords.map((keyword) => ({ keyword }))
      }
    },
    overrideAccess: true
  });
}

async function main() {
  const payload = await getPayload({ config });

  await seedAdmin(payload);
  const serviceDocs = await seedServices(payload);
  await seedTeamMembers(payload);
  await seedTestimonials(payload);
  await seedFaqs(payload);
  await seedTreatmentTopics(payload);
  await seedPages(payload);
  await seedGlobals(payload, serviceDocs);

  console.log("Payload seed completed.");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
