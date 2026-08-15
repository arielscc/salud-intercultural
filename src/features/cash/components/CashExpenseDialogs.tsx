"use client";

import { useState } from "react";
import { Camera, HandCoins, PackagePlus, UsersRound, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { StaleCashSessionModal } from "@/components/internal/cash/StaleCashSessionModal";
import { Button } from "@/components/internal/ui/Button";
import { cn } from "@/lib/cn";

type Person = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

type CashExpenseDialogsProps = {
  cashSessionId?: string | null;
  personnel: Person[];
  authorizers: Person[];
  currentUserId: string;
  disabled?: boolean;
  disabledReason?: string;
  hasStaleOpenSession?: boolean;
  createStaffCashExpenseAction: (formData: FormData) => Promise<void>;
  createUrgentPurchaseExpenseAction: (formData: FormData) => Promise<void>;
  createOtherCashExpenseAction: (formData: FormData) => Promise<void>;
};

function personName(person: Person) {
  return person.name ?? person.email;
}

function ModalShell({
  title,
  description,
  trigger,
  unavailable,
  unavailableReason,
  children
}: {
  title: string;
  description: string;
  trigger: (openDialog: () => void) => React.ReactNode;
  unavailable?: boolean;
  unavailableReason?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-3 top-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-y-1/2 overflow-hidden rounded-[9px] border border-border bg-surface shadow-2xl",
            "sm:left-1/2 sm:right-auto sm:w-[min(94vw,680px)] sm:-translate-x-1/2"
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <Dialog.Title className="font-sora text-lg font-bold text-text">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 px-0">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>
          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 sm:p-5">
            {unavailable ? (
              <p className="rounded-[8px] border border-warning/25 bg-warning/10 px-3 py-3 text-sm text-warning">
                {unavailableReason}
              </p>
            ) : (
              children
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ExpenseTrigger({
  icon: Icon,
  title,
  description,
  unavailable,
  onClick
}: {
  icon: typeof HandCoins;
  title: string;
  description: string;
  unavailable?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring grid min-h-24 gap-2 rounded-[9px] border bg-surface px-3.5 py-3 text-left transition hover:border-primary/35 hover:bg-primary/5",
        unavailable ? "border-warning/30 bg-warning/5" : "border-border"
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-text">
          <span className="grid size-8 place-items-center rounded-[8px] bg-background text-primary-dark">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </span>
      <span className="text-xs leading-5 text-muted">{description}</span>
    </button>
  );
}

export function CashExpenseDialogs({
  cashSessionId,
  personnel,
  authorizers,
  currentUserId,
  disabled,
  disabledReason = "Primero abre una Caja de hoy para registrar egresos.",
  hasStaleOpenSession,
  createStaffCashExpenseAction,
  createUrgentPurchaseExpenseAction,
  createOtherCashExpenseAction
}: CashExpenseDialogsProps) {
  const unavailable = disabled || !cashSessionId;
  const [staleModalOpen, setStaleModalOpen] = useState(false);
  const openOrWarn = (openDialog: () => void) => {
    if (hasStaleOpenSession) {
      setStaleModalOpen(true);
      return;
    }
    openDialog();
  };

  return (
    <section className="grid gap-3 rounded-[9px] border border-border bg-surface p-4">
      {hasStaleOpenSession ? (
        <StaleCashSessionModal
          open={staleModalOpen}
          onOpenChange={setStaleModalOpen}
          operationLabel="egreso"
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Egresos de Caja</h2>
          <p className="mt-0.5 text-xs text-muted">
            Registra salidas operativas sin mezclarlas con las solicitudes de cobro.
          </p>
        </div>
        {unavailable ? (
          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
            Caja requerida
          </span>
        ) : null}
      </div>
      {unavailable ? (
        <p className="rounded-[8px] border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
          {disabledReason}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <ModalShell
          title="Dinero al personal"
          description="Almuerzo, transporte u otro apoyo separado por empleado."
          unavailable={unavailable}
          unavailableReason={disabledReason}
          trigger={(openDialog) => (
            <ExpenseTrigger
              icon={UsersRound}
              title="Dinero al personal"
              description="Montos individuales para una o varias personas."
              unavailable={unavailable}
              onClick={() => openOrWarn(openDialog)}
            />
          )}
        >
          <form action={createStaffCashExpenseAction} className="grid gap-3">
            <input type="hidden" name="cashSessionId" value={cashSessionId ?? ""} />
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <input type="hidden" name="returnTo" value="/sigeco/administracion" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoría">
                <select className={internalInputClassName} name="category" defaultValue="lunch">
                  <option value="lunch">Almuerzo</option>
                  <option value="transport">Transporte</option>
                  <option value="staff_other">Otro apoyo</option>
                </select>
              </Field>
              <Field label="Persona que recibe">
                <select className={internalInputClassName} name="receivedById" defaultValue="" required>
                  <option value="">Seleccionar</option>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Persona que entrega">
                <select className={internalInputClassName} name="deliveredById" defaultValue={currentUserId} required>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <fieldset className="grid gap-2 rounded-[9px] border border-border p-3">
              <legend className="px-1 text-[13px] font-semibold text-text">
                Beneficiarios y monto individual
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {personnel.map((person) => (
                  <Field key={person.id} label={`${personName(person)} · Bs`}>
                    <input className={internalInputClassName} name={`beneficiary:${person.id}`} inputMode="decimal" placeholder="0.00" />
                  </Field>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3">
              <Field label="Autorizado por">
                <select className={internalInputClassName} name="authorizedById" defaultValue="" required>
                  <option value="">Seleccionar Dirección</option>
                  {authorizers.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Nota opcional">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="note" />
            </Field>
            <SubmitButton>Registrar entrega</SubmitButton>
          </form>
        </ModalShell>

        <ModalShell
          title="Compra urgente"
          description="Insumos que deben comprarse en ese momento con dinero de Caja."
          unavailable={unavailable}
          unavailableReason={disabledReason}
          trigger={(openDialog) => (
            <ExpenseTrigger
              icon={PackagePlus}
              title="Compra urgente"
              description="Insumos, comprobante y responsables."
              unavailable={unavailable}
              onClick={() => openOrWarn(openDialog)}
            />
          )}
        >
          <form action={createUrgentPurchaseExpenseAction} className="grid gap-3">
            <input type="hidden" name="cashSessionId" value={cashSessionId ?? ""} />
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <input type="hidden" name="returnTo" value="/sigeco/administracion" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoría">
                <select className={internalInputClassName} name="category" defaultValue="clinical_material">
                  <option value="injectables">Inyectables</option>
                  <option value="clinical_material">Material clínico</option>
                  <option value="cleaning">Limpieza</option>
                  <option value="office">Oficina</option>
                  <option value="other">Otro</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto entregado Bs">
                <input className={internalInputClassName} name="deliveredAmount" inputMode="decimal" placeholder="0.00" required />
              </Field>
              <Field label="Cambio devuelto Bs">
                <input className={internalInputClassName} name="returnedChange" inputMode="decimal" defaultValue="0.00" required />
              </Field>
            </div>
            <Field label="Artículo o artículos">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="itemDescription" placeholder="Ej. 2 jeringas, 1 algodón, 1 alcohol" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Solicitante">
                <select className={internalInputClassName} name="requestedById" defaultValue="" required>
                  <option value="">Seleccionar</option>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Recibe el dinero">
                <select className={internalInputClassName} name="receivedById" defaultValue="" required>
                  <option value="">Seleccionar</option>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Entrega el dinero">
                <select className={internalInputClassName} name="deliveredById" defaultValue={currentUserId} required>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Autorizado por">
                <select className={internalInputClassName} name="authorizedById" defaultValue="" required>
                  <option value="">Seleccionar Dirección</option>
                  {authorizers.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Motivo de urgencia">
              <input className={internalInputClassName} name="urgencyReason" placeholder="Explica por qué no puede esperar" required />
            </Field>
            <Field label="Comprobante opcional">
              <div className="relative">
                <Camera className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden="true" />
                <input
                  className={`${internalInputClassName} py-2 pl-10 file:mr-3 file:rounded-[7px] file:border-0 file:bg-surface-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold`}
                  type="file"
                  name="receipt"
                  accept="image/*"
                  capture="environment"
                />
              </div>
            </Field>
            <Field label="Nota opcional">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="note" />
            </Field>
            <SubmitButton>Registrar compra urgente</SubmitButton>
          </form>
        </ModalShell>

        <ModalShell
          title="Otro egreso"
          description="Salida de efectivo que no corresponde a personal ni compra urgente."
          unavailable={unavailable}
          unavailableReason={disabledReason}
          trigger={(openDialog) => (
            <ExpenseTrigger
              icon={HandCoins}
              title="Otro egreso"
              description="Monto, receptor, autorización y motivo."
              unavailable={unavailable}
              onClick={() => openOrWarn(openDialog)}
            />
          )}
        >
          <form action={createOtherCashExpenseAction} className="grid gap-3">
            <input type="hidden" name="cashSessionId" value={cashSessionId ?? ""} />
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <input type="hidden" name="returnTo" value="/sigeco/administracion" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Monto Bs">
                <input className={internalInputClassName} name="amount" inputMode="decimal" placeholder="0.00" required />
              </Field>
              <Field label="Persona que recibe">
                <select className={internalInputClassName} name="receivedById" defaultValue="" required>
                  <option value="">Seleccionar</option>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Persona que entrega">
                <select className={internalInputClassName} name="deliveredById" defaultValue={currentUserId} required>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Autorizado por">
                <select className={internalInputClassName} name="authorizedById" defaultValue="" required>
                  <option value="">Seleccionar Dirección</option>
                  {authorizers.map((person) => (
                    <option key={person.id} value={person.id}>{personName(person)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Motivo">
              <input className={internalInputClassName} name="reason" required />
            </Field>
            <Field label="Nota opcional">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="note" />
            </Field>
            <SubmitButton>Registrar egreso</SubmitButton>
          </form>
        </ModalShell>
      </div>
    </section>
  );
}
