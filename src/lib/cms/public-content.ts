import config from "@payload-config";
import { getPayload } from "payload";
import { siteConfig as fallbackSiteConfig } from "@/config/site";
import { faqs as fallbackFaqs } from "@/data/faqs";
import { homeContent as fallbackHomeContent } from "@/data/home";
import { services as fallbackServices } from "@/data/services";
import { teamMembers as fallbackTeamMembers } from "@/data/team";
import { testimonials as fallbackTestimonials } from "@/data/testimonials";
import { seo as fallbackSeo, siteUrl } from "@/lib/seo";
import { getImageAlt } from "@/lib/images";
import type {
  FAQ,
  IconName,
  Service,
  TeamMember,
  Testimonial
} from "@/types/landing";
import type {
  Faq as PayloadFaq,
  HomeContent,
  Media,
  Page,
  Service as PayloadService,
  SiteSetting,
  TeamMember as PayloadTeamMember,
  Testimonial as PayloadTestimonial
} from "@/types/payload-types";

type ContentSource = "cms" | "fallback";

type Widen<T> = T extends readonly (infer Item)[]
  ? readonly Widen<Item>[]
  : T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends object
          ? { -readonly [Key in keyof T]: Widen<T[Key]> }
          : T;

export type SiteSettings = Widen<typeof fallbackSiteConfig>;

export type PublicContent<T> = {
  data: T;
  source: ContentSource;
  error?: string;
};

export type PublicHomeContent = Widen<typeof fallbackHomeContent>;

const fallbackSettings: SiteSettings = fallbackSiteConfig;

const defaultServiceIcon: IconName = "stethoscope";
const defaultImage =
  "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1000&q=85";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "CMS content unavailable";
}

async function getPayloadClient() {
  return getPayload({ config });
}

function listText(items?: { text: string }[] | null) {
  return items?.map((item) => item.text).filter(Boolean) ?? [];
}

function mediaUrl(image?: (number | null) | Media) {
  return typeof image === "object" && image?.url ? image.url : undefined;
}

function mediaAlt(image?: (number | null) | Media) {
  return typeof image === "object" && image?.alt ? image.alt : undefined;
}

function seoFromPayload(
  payloadSeo: { title?: string | null; description?: string | null } | undefined,
  fallback: { title: string; description: string }
) {
  return {
    title: payloadSeo?.title || fallback.title,
    description: payloadSeo?.description || fallback.description
  };
}

function mapService(doc: PayloadService): Service {
  const fallback =
    fallbackServices.find((service) => service.slug === doc.slug) ?? fallbackServices[0];

  return {
    slug: doc.slug,
    image: mediaUrl(doc.image) ?? doc.imageUrl ?? fallback?.image ?? defaultImage,
    imageAlt: getImageAlt(doc.imageAlt ?? mediaAlt(doc.image) ?? fallback?.imageAlt, doc.title),
    title: doc.title,
    description: doc.description,
    benefits: listText(doc.benefits),
    relatedProblems: listText(doc.relatedProblems),
    whatsappMessage:
      doc.whatsappMessage ?? fallback?.whatsappMessage ?? `Hola, quiero consultar por ${doc.title}.`,
    icon: (doc.icon as IconName | null) ?? fallback?.icon ?? defaultServiceIcon,
    active: doc.active ?? true,
    featured: doc.featured ?? false,
    seo: seoFromPayload(doc.seo, fallback?.seo ?? fallbackSeo)
  };
}

function mapTeamMember(doc: PayloadTeamMember): TeamMember {
  const fallback =
    fallbackTeamMembers.find((member) => member.slug === doc.slug) ?? fallbackTeamMembers[0];

  return {
    id: doc.slug,
    slug: doc.slug,
    name: doc.name,
    photo: mediaUrl(doc.image) ?? doc.imageUrl ?? fallback?.photo ?? defaultImage,
    photoAlt: getImageAlt(doc.imageAlt ?? mediaAlt(doc.image) ?? fallback?.photoAlt, doc.name),
    role: doc.role,
    specialty: doc.specialty,
    description: doc.description,
    credentials: listText(doc.credentials),
    focusAreas: listText(doc.focusAreas),
    active: doc.active ?? true,
    featured: doc.featured ?? false,
    order: doc.order ?? 0
  };
}

function mapTestimonial(doc: PayloadTestimonial): Testimonial {
  return {
    id: doc.slug,
    quote: doc.quote,
    author: doc.author,
    treatmentType: doc.treatmentType,
    rating: doc.rating ?? undefined,
    date: doc.publishedAt?.slice(0, 10),
    active: doc.active ?? true,
    featured: doc.featured ?? false,
    order: doc.order ?? 0,
    privacyNotice: doc.privacyNotice ?? undefined
  };
}

function mapFaq(doc: PayloadFaq): FAQ {
  return {
    id: String(doc.id),
    question: doc.question,
    answer: doc.answer,
    category: doc.category,
    active: doc.active ?? true,
    featured: doc.featured ?? false,
    order: doc.order ?? 0
  };
}

function orderByContentOrder<T extends { order?: number; title?: string; name?: string }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.title ?? a.name ?? "").localeCompare(b.title ?? b.name ?? "", "es");
  });
}

function withFallback<T>(data: T, error?: string): PublicContent<T> {
  return { data, source: "fallback", error };
}

function withCms<T>(data: T): PublicContent<T> {
  return { data, source: "cms" };
}

export async function getPublicServices(): Promise<PublicContent<Service[]>> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "services",
      depth: 1,
      limit: 100,
      overrideAccess: false,
      sort: "order"
    });
    const docs = result.docs.map(mapService).filter((service) => service.active);
    return docs.length ? withCms(orderByContentOrder(docs)) : withFallback(fallbackServices);
  } catch (error) {
    return withFallback(fallbackServices, getErrorMessage(error));
  }
}

export async function getPublicTeamMembers(): Promise<PublicContent<TeamMember[]>> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "team-members",
      depth: 1,
      limit: 100,
      overrideAccess: false,
      sort: "order"
    });
    const docs = result.docs.map(mapTeamMember).filter((member) => member.active);
    return docs.length ? withCms(orderByContentOrder(docs)) : withFallback(fallbackTeamMembers);
  } catch (error) {
    return withFallback(fallbackTeamMembers, getErrorMessage(error));
  }
}

export async function getPublicTestimonials(): Promise<PublicContent<Testimonial[]>> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "testimonials",
      depth: 0,
      limit: 100,
      overrideAccess: false,
      sort: "order"
    });
    const docs = result.docs.map(mapTestimonial).filter((testimonial) => testimonial.active);
    return docs.length ? withCms(orderByContentOrder(docs)) : withFallback(fallbackTestimonials);
  } catch (error) {
    return withFallback(fallbackTestimonials, getErrorMessage(error));
  }
}

export async function getPublicFaqs(): Promise<PublicContent<FAQ[]>> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "faqs",
      depth: 0,
      limit: 100,
      overrideAccess: false,
      sort: "order"
    });
    const docs = result.docs.map(mapFaq).filter((faq) => faq.active);
    return docs.length ? withCms(orderByContentOrder(docs)) : withFallback(fallbackFaqs);
  } catch (error) {
    return withFallback(fallbackFaqs, getErrorMessage(error));
  }
}

export async function getSiteSettings(): Promise<PublicContent<SiteSettings>> {
  try {
    const payload = await getPayloadClient();
    const settings = await payload.findGlobal({
      slug: "site-settings",
      depth: 0,
      overrideAccess: false
    });

    return withCms(mapSiteSettings(settings));
  } catch (error) {
    return withFallback(fallbackSettings, getErrorMessage(error));
  }
}

function mapSiteSettings(settings: SiteSetting): SiteSettings {
  return {
    ...fallbackSettings,
    name: settings.brand?.name ?? fallbackSettings.name,
    legalName: settings.brand?.legalName ?? fallbackSettings.legalName,
    slogan: settings.brand?.slogan ?? fallbackSettings.slogan,
    description: settings.brand?.description ?? fallbackSettings.description,
    contact: {
      ...fallbackSettings.contact,
      whatsapp: settings.contact?.whatsapp ?? fallbackSettings.contact.whatsapp,
      phone: settings.contact?.phone ?? fallbackSettings.contact.phone,
      email: settings.contact?.email ?? fallbackSettings.contact.email,
      address: settings.contact?.address ?? fallbackSettings.contact.address,
      zone: settings.contact?.zone ?? fallbackSettings.contact.zone,
      city: settings.contact?.city ?? fallbackSettings.contact.city,
      schedule: settings.contact?.schedule ?? fallbackSettings.contact.schedule,
      mapsUrl: settings.contact?.mapsUrl ?? fallbackSettings.contact.mapsUrl
    },
    conversion: {
      ...fallbackSettings.conversion,
      whatsappPhone: settings.contact?.whatsapp ?? fallbackSettings.conversion.whatsappPhone,
      callPhone: settings.contact?.phone ?? fallbackSettings.conversion.callPhone,
      defaultWhatsAppMessage:
        settings.conversion?.defaultWhatsAppMessage ??
        fallbackSettings.conversion.defaultWhatsAppMessage,
      afterLeadWhatsAppMessage:
        settings.conversion?.afterLeadWhatsAppMessage ??
        fallbackSettings.conversion.afterLeadWhatsAppMessage
    },
    social: {
      ...fallbackSettings.social,
      facebook: settings.social?.facebook ?? fallbackSettings.social.facebook,
      tiktok: settings.social?.tiktok ?? fallbackSettings.social.tiktok
    }
  };
}

export async function getPublicHomeContent(): Promise<PublicContent<PublicHomeContent>> {
  try {
    const payload = await getPayloadClient();
    const home = await payload.findGlobal({
      slug: "home-content",
      depth: 1,
      overrideAccess: false
    });

    if (home?.hero?.title) {
      return withCms(mapHomeContent(home));
    }

    const result = await payload.find({
      collection: "pages",
      depth: 1,
      limit: 1,
      overrideAccess: false,
      where: {
        slug: {
          equals: "home"
        }
      }
    });
    const page = result.docs[0];

    if (!page) {
      return withFallback(fallbackHomeContent);
    }

    return withCms({
      ...fallbackHomeContent,
      hero: {
        ...fallbackHomeContent.hero,
        eyebrow: page.hero?.eyebrow
          ? [page.hero.eyebrow, ...fallbackHomeContent.hero.eyebrow.slice(1)]
          : fallbackHomeContent.hero.eyebrow,
        title: page.title || fallbackHomeContent.hero.title,
        description: page.summary || page.content || fallbackHomeContent.hero.description
      },
      editableBlocks: page.content
        ? [
            {
              title: page.title,
              description: page.content
            },
            ...fallbackHomeContent.editableBlocks.slice(1)
          ]
        : fallbackHomeContent.editableBlocks
    });
  } catch (error) {
    return withFallback(fallbackHomeContent, getErrorMessage(error));
  }
}

function mapHomeContent(home: HomeContent): PublicHomeContent {
  const featuredServiceSlugs =
    home.featuredServices
      ?.map((service) => (typeof service === "object" ? service.slug : null))
      .filter((slug): slug is string => Boolean(slug)) ??
    fallbackHomeContent.featuredServiceSlugs;

  return {
    ...fallbackHomeContent,
    hero: {
      eyebrow:
        home.hero.eyebrow?.map((item) => item.text).filter(Boolean) ??
        fallbackHomeContent.hero.eyebrow,
      title: home.hero.title || fallbackHomeContent.hero.title,
      description: home.hero.description || fallbackHomeContent.hero.description,
      primaryCta: {
        label: home.hero.primaryCta?.label || fallbackHomeContent.hero.primaryCta.label,
        message: home.hero.primaryCta?.message || fallbackHomeContent.hero.primaryCta.message
      },
      secondaryCta: {
        label: home.hero.secondaryCta?.label || fallbackHomeContent.hero.secondaryCta.label
      },
      trustNote: home.hero.trustNote || fallbackHomeContent.hero.trustNote
    },
    stats:
      home.stats?.map((stat) => ({ value: stat.value, label: stat.label })) ??
      fallbackHomeContent.stats,
    featuredServiceSlugs,
    featuredVideo: {
      title: home.featuredVideo?.title || fallbackHomeContent.featuredVideo.title,
      description:
        home.featuredVideo?.description || fallbackHomeContent.featuredVideo.description,
      ctaLabel: home.featuredVideo?.ctaLabel || fallbackHomeContent.featuredVideo.ctaLabel
    },
    editableBlocks:
      home.editableBlocks?.map((block) => ({
        title: block.title,
        description: block.description
      })) ?? fallbackHomeContent.editableBlocks
  };
}

export async function getPublicPage(slug: string): Promise<PublicContent<Page | null>> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "pages",
      depth: 1,
      limit: 1,
      overrideAccess: false,
      where: {
        slug: {
          equals: slug
        }
      }
    });

    return result.docs[0] ? withCms(result.docs[0]) : withFallback(null);
  } catch (error) {
    return withFallback(null, getErrorMessage(error));
  }
}

export async function getPublicPageMetadata(
  slug: string,
  fallback: { title: string; description: string; path: string }
) {
  if (slug === "home") {
    try {
      const payload = await getPayloadClient();
      const home = await payload.findGlobal({
        slug: "home-content",
        depth: 0,
        overrideAccess: false
      });
      const title = home.seo?.title || fallback.title;
      const description = home.seo?.description || fallback.description;
      const canonical = `${siteUrl}${fallback.path}`;

      return {
        title,
        description,
        alternates: {
          canonical
        },
        openGraph: {
          title,
          description,
          url: canonical,
          type: "website"
        }
      };
    } catch {
      // Page metadata below keeps the existing fallback behavior if the global is unavailable.
    }
  }

  const page = await getPublicPage(slug);
  const title = page.data?.seo?.title || fallback.title;
  const description = page.data?.seo?.description || fallback.description;
  const canonical = `${siteUrl}${fallback.path}`;

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website"
    }
  };
}

export function getFeaturedServices(services: Service[], slugs?: readonly string[]) {
  const activeServices = services.filter((service) => service.active);
  if (slugs?.length) {
    const selected = slugs
      .map((slug) => activeServices.find((service) => service.slug === slug))
      .filter((service): service is Service => Boolean(service));
    if (selected.length) return selected;
  }

  return activeServices.filter((service) => service.featured);
}

export function getFeaturedTestimonials(testimonials: Testimonial[]) {
  return testimonials.filter((testimonial) => testimonial.active && testimonial.featured);
}

export function getFeaturedFaqs(faqs: FAQ[]) {
  return faqs.filter((faq) => faq.active && faq.featured);
}
