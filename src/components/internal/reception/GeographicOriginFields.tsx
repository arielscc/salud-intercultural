"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { ChipOption } from "@/components/internal/reception/funnel-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  BOLIVIA_COUNTRY,
  boliviaDepartments,
  commonCountries,
  findGeographicPlace,
  frequentGeographicPlaces,
  geographicPlaces,
  type GeographicOriginValue
} from "@/features/geography/origin";
import { cn } from "@/lib/cn";

const OTHER_COUNTRY = "__other_country__";

export function GeographicOriginFields({
  value,
  onChange,
  label,
  description,
  idPrefix,
  required = false,
  className
}: {
  value: GeographicOriginValue;
  onChange: (value: GeographicOriginValue) => void;
  label: string;
  description?: string;
  idPrefix: string;
  required?: boolean;
  className?: string;
}) {
  const cityInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const listId = `${idPrefix}-${generatedId}-cities`;
  const [otherCountrySelected, setOtherCountrySelected] = useState(
    value.country !== "" &&
      !commonCountries.some((country) => country === value.country)
  );
  const commonCountry = commonCountries.find(
    (country) => country === value.country
  );
  const countryChoice = commonCountry
    ? commonCountry
    : otherCountrySelected || value.country
      ? OTHER_COUNTRY
      : "";
  const matchingPlaces = useMemo(() => {
    const search = value.city.trim().toLocaleLowerCase("es");
    if (search.length < 2) return geographicPlaces;
    return geographicPlaces.filter((place) =>
      place.city.toLocaleLowerCase("es").includes(search)
    );
  }, [value.city]);

  function choosePlace(place: GeographicOriginValue) {
    setOtherCountrySelected(false);
    onChange({ ...place });
  }

  function changeCity(city: string) {
    const place = findGeographicPlace(city);
    onChange(place ? { ...place } : { ...value, city });
  }

  function changeCountry(country: string) {
    if (country === OTHER_COUNTRY) {
      setOtherCountrySelected(true);
      onChange({ ...value, country: "", department: "" });
      return;
    }

    setOtherCountrySelected(false);
    onChange({
      ...value,
      country,
      department:
        country === BOLIVIA_COUNTRY ? value.department : ""
    });
  }

  return (
    <fieldset className={cn("grid gap-3", className)}>
      <legend className="text-[13px] font-semibold text-text">
        {label}
        {required ? " *" : ""}
      </legend>
      {description ? (
        <p className="-mt-1 text-xs leading-relaxed text-muted">{description}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {frequentGeographicPlaces.map((place) => (
          <ChipOption
            key={place.city}
            selected={
              value.city === place.city &&
              value.department === place.department &&
              value.country === place.country
            }
            onClick={() => choosePlace(place)}
          >
            {place.city}
          </ChipOption>
        ))}
        <ChipOption
          selected={
            value.city !== "" &&
            !frequentGeographicPlaces.some(
              (place) => place.city === value.city
            )
          }
          onClick={() => {
            onChange({
              city: "",
              department: value.department,
              country: value.country || BOLIVIA_COUNTRY
            });
            window.requestAnimationFrame(() => cityInputRef.current?.focus());
          }}
        >
          Otro
        </ChipOption>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium text-text sm:col-span-2">
          <span>Buscar o escribir ciudad</span>
          <span className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              ref={cityInputRef}
              className={cn(internalInputClassName, "pl-10")}
              type="search"
              list={listId}
              value={value.city}
              onChange={(event) => changeCity(event.target.value)}
              placeholder="Ej. El Alto, Cochabamba o Tiquipaya"
              autoComplete="off"
            />
          </span>
          <datalist id={listId}>
            {matchingPlaces.map((place) => (
              <option key={place.city} value={place.city}>
                {place.department}, {place.country}
              </option>
            ))}
          </datalist>
          <span className="text-xs font-normal text-muted">
            Si no aparece en la lista, escribe el lugar y completa los campos.
          </span>
        </label>

        <label className="grid gap-1.5 text-[13px] font-medium text-text">
          <span>País</span>
          <Select value={countryChoice} onValueChange={changeCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el país" />
            </SelectTrigger>
            <SelectContent>
              {commonCountries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_COUNTRY}>Otro país</SelectItem>
            </SelectContent>
          </Select>
        </label>

        {countryChoice === OTHER_COUNTRY ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-text">
            <span>Nombre del país</span>
            <input
              className={internalInputClassName}
              value={value.country}
              onChange={(event) =>
                onChange({ ...value, country: event.target.value })
              }
              placeholder="¿Cuál?"
            />
          </label>
        ) : value.country === BOLIVIA_COUNTRY ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-text">
            <span>Departamento</span>
            <Select
              value={value.department}
              onValueChange={(department) =>
                onChange({ ...value, department })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el departamento" />
              </SelectTrigger>
              <SelectContent>
                {boliviaDepartments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : (
          <label className="grid gap-1.5 text-[13px] font-medium text-text">
            <span>Departamento, estado o provincia (opcional)</span>
            <input
              className={internalInputClassName}
              value={value.department}
              onChange={(event) =>
                onChange({ ...value, department: event.target.value })
              }
              placeholder="Si corresponde"
            />
          </label>
        )}
      </div>
    </fieldset>
  );
}
