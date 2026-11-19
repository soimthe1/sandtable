/**
 * A live UTC ("Zulu") clock in the header - real, ticking data rather than
 * decoration, and a small nod to the convention that military planning
 * references times in Zulu. Cheap to build (no dependency), and it's the
 * kind of thing that makes a header read as "operations room" instead of
 * "web form".
 */
import { useEffect, useState } from "react";

function formatZulu(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
}

export function ZuluClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="zulu-clock mono" aria-label="Current time, UTC">
      <span className="live-dot" aria-hidden="true" />
      <span className="eyebrow">ZULU</span> {formatZulu(now)}
    </span>
  );
}
