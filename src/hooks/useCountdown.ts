import { useEffect, useState } from "react";

/** Seconds remaining until `deadline` (ISO), ticking every second; 0 when passed. */
export function useCountdown(deadline: string | undefined): number {
  const target = deadline ? Date.parse(deadline) : Number.NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return Number.isNaN(target) ? 0 : Math.max(0, Math.round((target - now) / 1000));
}

export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
