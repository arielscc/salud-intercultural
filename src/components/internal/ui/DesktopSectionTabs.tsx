"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type SectionTab = {
  id: string;
  label: string;
  count?: number;
};

const ActiveSectionContext = createContext<string | null>(null);

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

function getHash() {
  return window.location.hash.slice(1);
}

export function DesktopSectionTabs({
  label,
  items,
  children
}: {
  label: string;
  items: SectionTab[];
  children: React.ReactNode;
}) {
  const fallbackId = items[0]?.id ?? "";
  const hash = useSyncExternalStore(subscribeToHash, getHash, () => fallbackId);
  const validIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const activeId = validIds.has(hash) ? hash : fallbackId;

  function selectTab(id: string) {
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.pushState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;

    const nextTab = document.getElementById(`desktop-tab-${items[nextIndex]?.id}`);
    nextTab?.focus();
    nextTab?.click();
  }

  return (
    <ActiveSectionContext.Provider value={activeId}>
      <div className="contents xl:block">
        <nav
          className="mb-3 hidden min-w-0 overflow-x-auto border-b border-border xl:flex"
          role="tablist"
          aria-label={label}
        >
          {items.map((item, index) => {
            const active = item.id === activeId;
            return (
              <a
                key={item.id}
                id={`desktop-tab-${item.id}`}
                href={`#${item.id}`}
                role="tab"
                aria-selected={active}
                aria-controls={`desktop-panel-${item.id}`}
                tabIndex={active ? 0 : -1}
                onClick={(event) => {
                  event.preventDefault();
                  selectTab(item.id);
                }}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "focus-ring relative flex min-h-10 shrink-0 items-center gap-1.5 rounded-t-[7px] px-3 text-xs font-semibold transition after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-transparent",
                  active
                    ? "text-primary-dark after:bg-primary"
                    : "text-muted hover:bg-surface-soft/50 hover:text-text"
                )}
              >
                {item.label}
                {item.count !== undefined ? (
                  <span className="tabular-nums text-[10px] text-muted">{item.count}</span>
                ) : null}
              </a>
            );
          })}
        </nav>
        <div className="contents xl:block">{children}</div>
      </div>
    </ActiveSectionContext.Provider>
  );
}

export function DesktopSectionPanel({
  id,
  children
}: {
  id: string;
  children: React.ReactNode;
}) {
  const activeId = useContext(ActiveSectionContext);
  const active = activeId === id;

  return (
    <section
      id={`desktop-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`desktop-tab-${id}`}
      tabIndex={active ? 0 : -1}
      className={cn("contents xl:block", !active && "xl:hidden")}
    >
      {children}
    </section>
  );
}

