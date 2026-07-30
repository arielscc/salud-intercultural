"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/cn";
import { internalInputClassName } from "@/components/internal/Field";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/internal/ui/Button";

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d 'de' MMMM 'de' yyyy";

function parseDateValue(value: string) {
  if (!value) return undefined;
  const parsed = parse(value, DATE_VALUE_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

/*
 * Selector de fecha con calendario en popover (dropdown de mes/anio para
 * navegar decadas rapido, pensado para fecha de nacimiento). Controlado con
 * el mismo formato de string (yyyy-MM-dd) que usaba el <input type="date">
 * nativo que reemplaza, para no tocar el resto del formulario.
 */
export function DatePickerField({
  value,
  onChange,
  placeholder = "Selecciona una fecha",
  disabled,
  fromYear = 1900,
  toYear,
  disableFuture = true
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  disableFuture?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          internalInputClassName,
          "flex items-center justify-between gap-2 text-left font-normal",
          !selected && "text-muted"
        )}
      >
        <span className="truncate">
          {selected ? format(selected, DATE_DISPLAY_FORMAT, { locale: es }) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          startMonth={new Date(fromYear, 0)}
          endMonth={toYear ? new Date(toYear, 11) : new Date()}
          disabled={disableFuture ? { after: new Date() } : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, DATE_VALUE_FORMAT) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePickerField({
  fromName,
  toName,
  defaultFrom = "",
  defaultTo = "",
  placeholder = "Selecciona un rango",
  className,
  triggerClassName
}: {
  fromName: string;
  toName: string;
  defaultFrom?: string;
  defaultTo?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const from = parseDateValue(defaultFrom);
    const to = parseDateValue(defaultTo);
    return from || to ? { from, to } : undefined;
  });
  const fromValue = range?.from ? format(range.from, DATE_VALUE_FORMAT) : "";
  const toValue = range?.to ? format(range.to, DATE_VALUE_FORMAT) : "";
  const displayValue = range?.from
    ? range.to
      ? `${format(range.from, "d MMM yyyy", { locale: es })} – ${format(range.to, "d MMM yyyy", { locale: es })}`
      : `Desde ${format(range.from, "d MMM yyyy", { locale: es })}`
    : placeholder;

  return (
    <div
      className={className}
      data-queue-refresh-dirty={
        fromValue !== defaultFrom || toValue !== defaultTo ? "true" : undefined
      }
    >
      <input type="hidden" name={fromName} value={fromValue} />
      <input type="hidden" name={toName} value={toValue} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            internalInputClassName,
            "flex items-center justify-between gap-2 text-left font-normal",
            !range?.from && "text-muted",
            triggerClassName
          )}
        >
          <span className="truncate tabular-nums">{displayValue}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="range"
            locale={es}
            selected={range}
            defaultMonth={range?.from}
            disabled={{ after: new Date() }}
            onSelect={(nextRange) => setRange(nextRange)}
          />
          <div className="flex justify-end gap-2 border-t border-border px-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRange(undefined)}>
              Limpiar
            </Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Aplicar rango
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/*
 * Combo fecha + hora para formularios de server actions que ya esperaban un
 * <input type="datetime-local">: expone un input hidden con el mismo name y
 * formato ("yyyy-MM-ddTHH:mm"), sin controlar el estado desde el padre.
 */
export function DateTimePickerField({
  name,
  defaultDate,
  required
}: {
  name: string;
  defaultDate?: Date;
  required?: boolean;
}) {
  const initial = defaultDate ?? new Date();
  const [date, setDate] = React.useState<Date | undefined>(initial);
  const [time, setTime] = React.useState(format(initial, "HH:mm"));
  const [open, setOpen] = React.useState(false);

  const isoValue = date ? `${format(date, DATE_VALUE_FORMAT)}T${time || "00:00"}` : "";

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={isoValue} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            internalInputClassName,
            "flex flex-1 items-center justify-between gap-2 text-left font-normal",
            !date && "text-muted"
          )}
        >
          <span className="truncate">
            {date ? format(date, "d MMM yyyy", { locale: es }) : "Fecha"}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="single"
            locale={es}
            selected={date}
            defaultMonth={date}
            onSelect={(selectedDate) => {
              setDate(selectedDate);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <input
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
        aria-label="Hora"
        className={cn(internalInputClassName, "w-28 shrink-0 tabular-nums")}
      />
    </div>
  );
}
