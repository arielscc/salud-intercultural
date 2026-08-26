-- Ajuste UX: el médico define un total editable (base) y un descuento a nivel de
-- orden (tope = suma de umbrales). Administración solo ve el total. Aditiva.
ALTER TABLE "DoctorOrder" ADD COLUMN "chargeBaseCents" INTEGER;
ALTER TABLE "DoctorOrder" ADD COLUMN "orderDiscountCents" INTEGER NOT NULL DEFAULT 0;
