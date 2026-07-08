export function TimelineItem({
  title,
  meta,
  body,
  aside
}: {
  title: React.ReactNode;
  meta?: string;
  body?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <article className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-semibold text-text">{title}</p>
        {aside ?? (meta ? <p className="text-[11px] tabular-nums text-muted">{meta}</p> : null)}
      </div>
      {aside && meta ? <p className="mt-0.5 text-[11px] tabular-nums text-muted">{meta}</p> : null}
      {body ? <div className="mt-1 text-sm text-muted">{body}</div> : null}
    </article>
  );
}
