"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/shared/Button";
import { siteConfig } from "@/config/site";
import { trackLeadFormSubmit } from "@/features/analytics";
import { createLeadSchema, type CreateLeadInput } from "@/features/leads/schemas/lead.schema";
import { createWhatsAppLink } from "@/lib/whatsapp";

type ContactLeadFormProps = {
  origin: "home" | "contact";
  title?: string;
  description?: string;
  source?: CreateLeadInput["source"];
};

export function ContactLeadForm({
  origin,
  title = "Enviar consulta",
  description = "Tu consulta se registrará para seguimiento y también puedes continuar por WhatsApp.",
  source = "website"
}: ContactLeadFormProps) {
  const pathname = usePathname();
  const formId = useId();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      source,
      status: "new",
      pagePath: pathname,
      website: ""
    }
  });
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const onSubmit = async (data: CreateLeadInput) => {
    setSubmitState("loading");
    setFeedbackMessage("");

    const payload = {
      ...data,
      source,
      status: "new",
      pagePath: pathname,
      website: data.website ?? ""
    };

    let response: Response;

    try {
      response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      setSubmitState("error");
      setFeedbackMessage(
        "No pudimos registrar la consulta. Inténtalo nuevamente o escríbenos por WhatsApp."
      );
      return;
    }

    const result = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setSubmitState("error");
      setFeedbackMessage(
        result?.message ??
          "No pudimos registrar la consulta. Inténtalo nuevamente o escríbenos por WhatsApp."
      );
      return;
    }

    setSubmitState("success");
    setFeedbackMessage(result?.message ?? "Consulta registrada correctamente.");
    trackLeadFormSubmit({
      formOrigin: origin,
      pagePath: pathname,
      source
    });
    reset({
      source,
      status: "new",
      pagePath: pathname,
      website: ""
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-[2rem] border border-border bg-background p-6 shadow-soft"
      data-lead-origin={origin}
      noValidate
    >
      <h3 className="font-sora text-2xl font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>

      <div className="mt-6 grid gap-4">
        <label htmlFor={`${formId}-name`} className="grid gap-2 text-sm font-semibold text-text">
          Nombre
          <input
            {...register("name")}
            id={`${formId}-name`}
            className="control-field"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          />
          {errors.name ? <span id={`${formId}-name-error`} className="text-xs text-accent">{errors.name.message}</span> : null}
        </label>

        <label htmlFor={`${formId}-phone`} className="grid gap-2 text-sm font-semibold text-text">
          Teléfono
          <input
            {...register("phone")}
            id={`${formId}-phone`}
            className="control-field"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${formId}-phone-error` : undefined}
          />
          {errors.phone ? (
            <span id={`${formId}-phone-error`} className="text-xs text-accent">{errors.phone.message}</span>
          ) : null}
        </label>

        <label htmlFor={`${formId}-email`} className="grid gap-2 text-sm font-semibold text-text">
          Email opcional
          <input
            {...register("email")}
            id={`${formId}-email`}
            className="control-field"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${formId}-email-error` : undefined}
          />
          {errors.email ? (
            <span id={`${formId}-email-error`} className="text-xs text-accent">{errors.email.message}</span>
          ) : null}
        </label>

        <label htmlFor={`${formId}-interest`} className="grid gap-2 text-sm font-semibold text-text">
          Motivo de consulta
          <input
            {...register("interest")}
            id={`${formId}-interest`}
            className="control-field"
            aria-invalid={Boolean(errors.interest)}
            aria-describedby={errors.interest ? `${formId}-interest-error` : undefined}
          />
          {errors.interest ? (
            <span id={`${formId}-interest-error`} className="text-xs text-accent">{errors.interest.message}</span>
          ) : null}
        </label>

        <label htmlFor={`${formId}-message`} className="grid gap-2 text-sm font-semibold text-text">
          Mensaje
          <textarea
            {...register("message")}
            id={`${formId}-message`}
            rows={5}
            className="control-field py-3"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? `${formId}-message-error` : undefined}
          />
          {errors.message ? (
            <span id={`${formId}-message-error`} className="text-xs text-accent">{errors.message.message}</span>
          ) : null}
        </label>

        <input {...register("source")} type="hidden" value={source} />
        <input {...register("status")} type="hidden" value="new" />
        <input {...register("pagePath")} type="hidden" value={pathname} />
        <label className="hidden">
          Sitio web
          <input {...register("website")} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitState === "loading"}
        aria-busy={submitState === "loading"}
        className="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:bg-primary-dark active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
      >
        {submitState === "loading" ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        ) : (
          <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {submitState === "loading" ? "Registrando consulta..." : "Enviar consulta"}
      </button>

      {submitState === "success" ? (
        <div className="mt-4 rounded-2xl border border-success/25 bg-success/10 p-4 text-sm leading-6 text-text" role="status" aria-live="polite">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            {feedbackMessage}
          </p>
          <Button
            href={createWhatsAppLink(siteConfig.conversion.afterLeadWhatsAppMessage)}
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="sm"
            className="mt-2 px-0 text-primary-dark hover:bg-transparent hover:text-primary"
            data-conversion-action="whatsapp_click"
            data-conversion-label="lead_success_whatsapp"
          >
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Continuar por WhatsApp
          </Button>
        </div>
      ) : null}

      {submitState === "error" ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-semibold leading-6 text-text" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          {feedbackMessage}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-muted">
        La información enviada es orientativa y no reemplaza una consulta profesional. Evita
        compartir datos médicos sensibles en este formulario.
      </p>
    </form>
  );
}
