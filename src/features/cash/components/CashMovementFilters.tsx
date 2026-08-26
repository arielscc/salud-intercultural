"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { internalInputClassName } from "@/components/internal/Field";

type FilterOption = {
  value: string;
  label: string;
};

export function CashMovementFilters({
  sessionId,
  selectedType,
  selectedChannel,
  typeOptions,
  channelOptions
}: {
  sessionId: string;
  selectedType?: string;
  selectedChannel?: string;
  typeOptions: FilterOption[];
  channelOptions: FilterOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const applyFilters = (type: string, channel: string) => {
    const params = new URLSearchParams({ session: sessionId });
    if (type) params.set("type", type);
    if (channel) params.set("channel", channel);
    startTransition(() => {
      router.replace(`/sigeco/administracion/caja?${params.toString()}`, {
        scroll: false
      });
    });
  };

  return (
    <div
      className="grid gap-2 border-y border-border bg-background px-[18px] py-3 sm:grid-cols-2"
      aria-busy={pending || undefined}
    >
      <select
        className={internalInputClassName}
        defaultValue={selectedType ?? ""}
        aria-label="Filtrar por tipo"
        onChange={(event) =>
          applyFilters(event.currentTarget.value, selectedChannel ?? "")
        }
      >
        <option value="">Todos los tipos</option>
        {typeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className={internalInputClassName}
        defaultValue={selectedChannel ?? ""}
        aria-label="Filtrar por medio"
        onChange={(event) =>
          applyFilters(selectedType ?? "", event.currentTarget.value)
        }
      >
        <option value="">Todos los medios</option>
        {channelOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
