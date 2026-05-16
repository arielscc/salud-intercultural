"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MapSection } from "@/components/landing/MapSection";
import { clinic } from "@/data/clinic";
import { createWhatsAppLink } from "@/lib/whatsapp";

const contactSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre."),
  phone: z.string().min(6, "Ingresa un teléfono válido."),
  reason: z.string().min(3, "Indica el motivo de consulta."),
  message: z.string().min(8, "Escribe un mensaje breve."),
  website: z.string().optional()
});

type ContactForm = z.infer<typeof contactSchema>;

export function ContactSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema)
  });
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const onSubmit = async (data: ContactForm) => {
    setSubmitState("loading");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        interest: data.reason,
        message: data.message,
        source: "website",
        website: ""
      })
    });

    if (!response.ok) {
      setSubmitState("error");
      return;
    }

    setSubmitState("success");
    reset();
  };

  return (
    <section id="contacto" className="bg-surface py-24">
      <Container>
        <SectionHeader
          eyebrow="Contacto"
          title="Estamos en El Alto para atenderte"
          description="Coordina tu visita por WhatsApp, llamada o mediante el formulario breve. Evitamos pedir datos médicos sensibles antes de la evaluación."
        />
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-background p-6 shadow-soft">
              <h3 className="font-sora text-2xl font-semibold text-text">{clinic.name}</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-muted">
                <p>{clinic.zone}, {clinic.displayAddress}</p>
                <p>{clinic.schedule}</p>
                <p>WhatsApp: {clinic.whatsapp}</p>
                <p>Teléfono secundario: {clinic.phoneSecondary}</p>
                <p>Correo: {clinic.email}</p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href={createWhatsAppLink("Hola, quiero agendar una valoración.")} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Escribir por WhatsApp
                </Button>
                <Button href={`tel:${clinic.phoneSecondary}`} variant="secondary">
                  <Phone className="mr-2 h-4 w-4" />
                  Llamar ahora
                </Button>
              </div>
            </div>
            <MapSection />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="rounded-[2rem] border border-border bg-background p-6 shadow-soft">
            <h3 className="font-sora text-2xl font-semibold text-text">Enviar consulta</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Tu consulta se registrará para seguimiento y también puedes continuar por WhatsApp.
            </p>
            <div className="mt-6 grid gap-4">
              {[
                ["name", "Nombre"],
                ["phone", "Teléfono"],
                ["reason", "Motivo de consulta"]
              ].map(([name, label]) => (
                <label key={name} className="grid gap-2 text-sm font-semibold text-text">
                  {label}
                  <input
                    {...register(name as keyof ContactForm)}
                    className="control-field"
                  />
                  {errors[name as keyof ContactForm] ? (
                    <span className="text-xs text-accent">{errors[name as keyof ContactForm]?.message}</span>
                  ) : null}
                </label>
              ))}
              <label className="grid gap-2 text-sm font-semibold text-text">
                Mensaje
                <textarea
                  {...register("message")}
                  rows={5}
                  className="control-field py-3"
                />
                {errors.message ? <span className="text-xs text-accent">{errors.message.message}</span> : null}
              </label>
              <input
                {...register("website")}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={submitState === "loading"}
              className="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:bg-primary-dark active:scale-[0.99]"
            >
              {submitState === "loading" ? (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {submitState === "loading" ? "Registrando consulta..." : "Enviar consulta"}
            </button>
            {submitState === "success" ? (
              <div className="mt-4 rounded-2xl border border-success/25 bg-success/10 p-4 text-sm leading-6 text-text">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Consulta registrada correctamente.
                </p>
                <a
                  href={createWhatsAppLink("Hola, acabo de enviar una consulta desde el sitio web.")}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex font-semibold text-primary-dark hover:text-primary"
                >
                  Continuar por WhatsApp
                </a>
              </div>
            ) : null}
            {submitState === "error" ? (
              <p className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-semibold text-text">
                No pudimos registrar la consulta. Inténtalo nuevamente o escríbenos por WhatsApp.
              </p>
            ) : null}
            <p className="mt-4 text-xs leading-5 text-muted">
              La información enviada es orientativa y no reemplaza una consulta profesional.
            </p>
          </form>
        </div>
      </Container>
    </section>
  );
}
