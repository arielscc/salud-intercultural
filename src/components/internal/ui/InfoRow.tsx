export function InfoRow({
  label,
  value,
  wide
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="m-0 mt-0.5 text-[15px] leading-snug text-text">{value || "Sin registro"}</dd>
    </div>
  );
}
