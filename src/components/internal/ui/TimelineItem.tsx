/*
 * Timeline estilo changelog (referencia: shadcn studio timeline 05):
 * columna izquierda con pill de estado y fecha, punto sobre el riel
 * vertical, y el contenido a la derecha. En movil se apila en una columna.
 */
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
    <article className="relative pb-6 pl-7 before:absolute before:bottom-0 before:left-[4.5px] before:top-2 before:w-[2px] before:rounded-full before:bg-muted/30 before:content-[''] last:pb-1 last:before:hidden sm:grid sm:grid-cols-[118px_1fr] sm:gap-x-7 sm:pl-0 sm:before:left-[122.5px]">
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full bg-primary ring-4 ring-primary/15 sm:left-[118px]"
      />
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mb-0 sm:flex-col sm:items-end sm:gap-1 sm:pr-4 sm:text-right">
        {aside ? (
          <span className="inline-flex items-center whitespace-nowrap rounded-full bg-text px-2.5 py-0.5 text-[11px] font-semibold text-surface">
            {aside}
          </span>
        ) : null}
        {meta ? (
          <span className="text-[11px] leading-snug tabular-nums text-muted">{meta}</span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug text-text">{title}</p>
        {body ? (
          <div className="mt-2 rounded-[7px] bg-background px-3.5 py-2.5 text-sm leading-relaxed text-muted">
            {body}
          </div>
        ) : null}
      </div>
    </article>
  );
}
