const googleMapsUrl =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL || "https://maps.app.goo.gl/Y6Uy1aftdg8346P28";

export const clinic = {
  name: 'Clínica de Medicina Natural y Tradicional "Salud Intercultural"',
  shortName: "Salud Intercultural",
  slogan: "Soluciones reales, no parches.",
  city: "El Alto",
  zone: "Cruce Villa Adela",
  address: "Av. A entre calle 6 y Av. Bolivia, primer piso",
  displayAddress: "Av. “A” entre calle 6 y Av. Bolivia, primer piso",
  whatsapp: "+59164175822",
  phoneSecondary: "+59162287251",
  email: "medicina.tradicional.ea@gmail.com",
  schedule: "Lunes a sábado — 09:00 a 18:00",
  social: {
    tiktok: "https://www.tiktok.com/@clinicademedicinanatural",
    facebook: "https://www.facebook.com/ClinicaDeMedicinaNaturalYTradicional/"
  },
  mapsUrl: googleMapsUrl,
  mapsEmbed:
    "https://www.google.com/maps?q=-16.5337401,-68.1910863&z=17&output=embed"
} as const;
