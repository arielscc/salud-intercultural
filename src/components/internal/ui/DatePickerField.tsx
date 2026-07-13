"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { internalInputClassName } from "@/components/internal/Field";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  fromYear = 1900
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
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
          endMonth={new Date()}
          disabled={{ after: new Date() }}
          onSelect={(date) => {
            onChange(date ? format(date, DATE_VALUE_FORMAT) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
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
