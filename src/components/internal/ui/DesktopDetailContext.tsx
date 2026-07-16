export function DesktopDetailContext({
  eyebrow,
  title,
  meta,
  status
}: {
  eyebrow: string;
  title: string;
  meta?: string | null;
  status?: React.ReactNode;
}) {
  return (
    <section className="sticky top-0 z-10 hidden border-b border-border bg-background pb-3 xl:block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-dark">
            {eyebrow}
          </p>
          <h3 className="mt-0.5 truncate font-sora text-base font-bold text-text">{title}</h3>
          {meta ? <p className="mt-0.5 truncate text-xs text-muted">{meta}</p> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
    </section>
  );
}

