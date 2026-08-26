"use client";

import { useEffect, useState } from "react";
import { formatDurationShort } from "@/features/area-times/report";

export function LiveElapsed({
  from,
  initialNow
}: {
  from: string;
  initialNow: string;
}) {
  const startedAt = new Date(from).getTime();
  const initial = new Date(initialNow).getTime();
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  return <>{formatDurationShort(Math.max(0, now - startedAt))}</>;
}
