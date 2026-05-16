import { MapPin } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { clinic } from "@/data/clinic";

export function MapSection() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
      <div className="flex items-center justify-between gap-4 border-b border-border p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-soft text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="font-sora font-semibold text-text">Cruce Villa Adela</p>
            <p className="text-sm text-muted">El Alto, Bolivia</p>
          </div>
        </div>
        <Button href={clinic.mapsUrl} target="_blank" rel="noreferrer" variant="secondary" className="hidden sm:inline-flex">
          Abrir mapa
        </Button>
      </div>
      <iframe
        title="Mapa de ubicación de Salud Intercultural en El Alto"
        src={clinic.mapsEmbed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[420px] w-full border-0"
      />
    </div>
  );
}
