import { Play, Video } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { homeContent } from "@/data/home";
import { clinic } from "@/data/clinic";

export function VideoSection() {
  return (
    <section className="py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          align="left"
          eyebrow="Video"
          title="Conoce nuestro enfoque de atención"
          description="Muy pronto integraremos videos educativos y testimonios reales de la clínica. Por ahora, esta sección queda preparada para contenido audiovisual."
        />
        <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-border bg-primary-dark shadow-lift">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(217,119,6,0.28),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(37,99,235,0.24),transparent_30%),linear-gradient(135deg,#064E3B,#0F766E)]" />
          <div className="relative flex h-full flex-col items-center justify-center p-8 text-center text-white">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/18 backdrop-blur">
              <Play className="h-7 w-7 fill-white" />
            </span>
            <p className="mt-5 font-sora text-2xl font-semibold">{homeContent.featuredVideo.title}</p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/82">
              {homeContent.featuredVideo.description}
            </p>
            <Button href={clinic.social.tiktok} target="_blank" rel="noreferrer" variant="light" className="mt-6">
              <Video className="mr-2 h-4 w-4" />
              {homeContent.featuredVideo.ctaLabel}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
