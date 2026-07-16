"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function DesktopPreviewDismiss({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !window.matchMedia("(min-width: 1280px)").matches) return;
      event.preventDefault();
      router.replace(href, { scroll: false });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [href, router]);

  return (
    <Link
      href={href}
      scroll={false}
      title="Cerrar vista previa"
      aria-label="Cerrar vista previa"
      className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] text-muted transition hover:bg-surface-soft hover:text-text"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

