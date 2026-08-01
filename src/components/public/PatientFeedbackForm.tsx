"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { feedbackAreaLabels, feedbackKindLabels } from "@/features/patient-feedback/policy";

export function PatientFeedbackForm({ token }: { token: string }) {
  const [kind, setKind] = useState<"survey" | "comment" | "complaint">("survey");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/encuesta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        rating: form.get("rating"),
        kind: form.get("kind"),
        area: form.get("area"),
        comment: form.get("comment"),
        healthRiskFlag: form.get("healthRiskFlag") === "on",
        privacyAcknowledged: form.get("privacyAcknowledged") === "on",
        website: form.get("website")
      })
    });
    setPending(false);
    if (response.ok) {
      setDone(true);
      return;
    }
    const result = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    setError(result?.message ?? "No pudimos guardar la respuesta. Inténtalo otra vez.");
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="mt-3 font-sora text-xl font-semibold text-text">Gracias por responder</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Su respuesta fue recibida. Si registró un reclamo, Dirección lo revisará según su prioridad.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <fieldset>
        <legend className="text-sm font-semibold text-text">1. ¿Cómo califica la atención recibida?</legend>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating} className="cursor-pointer text-center">
              <input className="peer sr-only" type="radio" name="rating" value={rating} required />
              <span className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-white font-semibold text-text peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                {rating}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted"><span>Mala</span><span>Excelente</span></div>
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold text-text">
        2. ¿Qué desea registrar?
        <select
          className="min-h-12 rounded-xl border border-border bg-white px-3 text-sm font-normal"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          {Object.entries(feedbackKindLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-semibold text-text">
        3. ¿Con qué parte de la atención se relaciona?
        <select className="min-h-12 rounded-xl border border-border bg-white px-3 text-sm font-normal" name="area">
          {Object.entries(feedbackAreaLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-semibold text-text">
        4. Cuéntenos brevemente
        <textarea
          className="min-h-32 rounded-xl border border-border bg-white p-3 text-sm font-normal leading-6"
          name="comment"
          maxLength={2000}
          required={kind === "complaint"}
          placeholder={kind === "complaint" ? "Explique qué ocurrió y qué necesita que revisemos." : "Este campo es opcional."}
        />
      </label>

      {kind === "complaint" ? (
        <label className="flex gap-3 rounded-xl border border-error/25 bg-error/5 p-4 text-sm leading-6 text-text">
          <input className="mt-1 h-5 w-5 shrink-0" type="checkbox" name="healthRiskFlag" />
          <span>
            <strong className="block text-error">Necesito revisión prioritaria</strong>
            Considero que pudo existir riesgo o daño para mi salud. Esta opción ayuda a Dirección a separar un posible incidente clínico de un reclamo general.
          </span>
        </label>
      ) : null}

      <label className="flex gap-3 text-sm leading-6 text-muted">
        <input className="mt-1 h-5 w-5 shrink-0" type="checkbox" name="privacyAcknowledged" required />
        <span>
          Confirmo que esta respuesta describe mi experiencia. Entiendo que no se publicará como testimonio sin otra autorización específica.
        </span>
      </label>
      <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {error ? <p className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Enviando…" : "Enviar respuesta"}
      </button>
      <p className="text-center text-xs leading-5 text-muted">
        Este formulario no sirve para emergencias. Si necesita atención urgente, comuníquese directamente con un servicio de emergencias.
      </p>
    </form>
  );
}
