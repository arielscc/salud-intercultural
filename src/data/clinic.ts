const googleMapsUrl =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ||
  "https://maps.app.goo.gl/Y6Uy1aftdg8346P28";
const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";
const publicWhatsapp =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  (isStaging ? "+59100000000" : "+59164175822");
const publicEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
  (isStaging ? "qa@staging.invalid" : "medicina.tradicional.ea@gmail.com");

export const clinic = {
  name: 'Clínica de Medicina Natural y Tradicional "Salud Intercultural"',
  shortName: "Salud Intercultural",
  slogan: "Soluciones reales, no parches.",
  city: "El Alto",
  zone: "Cruce Villa Adela",
  address: "Av. A entre calle 6 y Av. Bolivia, primer piso",
  displayAddress: "Av. “A” entre calle 6 y Av. Bolivia, primer piso",
  whatsapp: publicWhatsapp,
  phoneSecondary: "+59162287251",
  email: publicEmail,
  schedule: "Lunes a sábado — 09:00 a 18:00",
  social: {
    tiktok: "https://www.tiktok.com/@clinicademedicinanatural",
    facebook: "https://www.facebook.com/ClinicaDeMedicinaNaturalYTradicional/",
  },
  mapsUrl: googleMapsUrl,
  mapsEmbed:
    "https://www.google.com/maps?q=-16.5337401,-68.1910863&z=17&output=embed",
} as const;
