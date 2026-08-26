import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function MobileBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex min-h-11 w-fit items-center gap-1 rounded-[7px] pr-2 text-sm font-semibold text-primary-dark sm:hidden"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
