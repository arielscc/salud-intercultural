"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/internal/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";

/*
 * Form para acciones irreversibles (sigeco-movil, Tarea 4). En movil
 * En movil (< 640 px) usa bottom sheet; en desktop (>= 1024 px) usa alert
 * dialog centrado. El rango intermedio conserva el submit directo existente.
 * Al resolver comparte el toast de exito del patron NoticeForm.
 */

type ConfirmFormProps = Omit<React.ComponentPropsWithoutRef<"form">, "action"> & {
  action: (formData: FormData) => Promise<void>;
  notice: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
};

export function ConfirmForm({
  action,
  notice,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  children,
  ...props
}: ConfirmFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const confirmingRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [confirmationMode, setConfirmationMode] = useState<"mobile" | "desktop" | null>(null);

  const [doneAt, formAction] = useActionState(
    async (_previous: number | null, formData: FormData) => {
      await action(formData);
      return Date.now();
    },
    null
  );

  useEffect(() => {
    if (doneAt) {
      confirmingRef.current = false;
      toast.success(notice);
    }
  }, [doneAt, notice]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;

    if (mobile || desktop) {
      event.preventDefault();
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setConfirmationMode(mobile ? "mobile" : "desktop");
    }
  }

  function handleConfirm() {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    confirmedRef.current = true;
    setConfirmationMode(null);
    formRef.current?.requestSubmit();
  }

  function handleCancel() {
    confirmingRef.current = false;
    setConfirmationMode(null);
  }

  return (
    <>
      <form {...props} ref={formRef} action={formAction} onSubmit={handleSubmit}>
        {children}
      </form>
      <Drawer
        open={confirmationMode === "mobile"}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DrawerContent>
          <DrawerHeader className="px-5 pt-2">
            <DrawerTitle>{confirmTitle}</DrawerTitle>
            <DrawerDescription>{confirmDescription}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="px-5 pb-6">
            <Button type="button" variant="danger" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={confirmationMode === "desktop"}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <AlertDialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.querySelector<HTMLButtonElement>("[data-confirm-cancel]")?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button data-confirm-cancel type="button" variant="outline">
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" variant="danger" onClick={handleConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
