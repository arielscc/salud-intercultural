import { MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { clinic } from "@/data/clinic";
import { createWhatsAppLink } from "@/lib/whatsapp";

export function FinalCTASection() {
  return (
    <section className="bg-surface pb-24">
      <Container>
        <div className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,rgba(217,119,6,0.22),transparent_26%),radial-gradient(circle_at_84%_10%,rgba(84,216,193,0.24),transparent_32%),linear-gradient(135deg,#036B7C,#059AB2)] p-8 text-center text-white shadow-lift sm:p-12">
          <h2 className="mx-auto max-w-3xl font-sora text-3xl font-semibold leading-tight sm:text-4xl">
            Da el primer paso hacia una atención más integral
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/84">
            Escríbenos por WhatsApp y cuéntanos qué problema deseas consultar. Te orientaremos para agendar una valoración en la clínica.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={createWhatsAppLink("Hola, quiero agendar una valoración.")} target="_blank" rel="noreferrer" variant="light">
              <MessageCircle className="mr-2 h-4 w-4" />
              Solicitar valoración
            </Button>
            <Button href={`tel:${clinic.phoneSecondary}`} variant="secondary" className="border-white/35 bg-white/10 text-white hover:bg-white/18">
              <Phone className="mr-2 h-4 w-4" />
              Llamar ahora
            </Button>
            <Button href={clinic.mapsUrl} target="_blank" rel="noreferrer" variant="secondary" className="border-white/35 bg-white/10 text-white hover:bg-white/18">
              <MapPin className="mr-2 h-4 w-4" />
              Ver ubicación
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
