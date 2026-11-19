/**
 * A tiny, self-contained inline-SVG icon set. Deliberately not an icon
 * font or an npm dependency - this app has to work air-gapped (see
 * README's Air-gapped note) and every icon here is a handful of stroked
 * paths, so there is nothing to fetch and nothing to install.
 *
 * Style: thin stroke, no fill except where noted, currentColor - matches
 * the grease-pencil-on-acetate identity (tokens.css) rather than a glossy
 * icon-font look. Every icon is decorative by default (aria-hidden) unless
 * a `title` is passed, since the text next to them always carries the
 * actual meaning (every user-facing string goes through i18n).
 */
import type { ReactNode, SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  title?: string;
}

function Svg({ size = 16, title, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** Compass rose - used as a light branding mark, not a functional compass. */
export function CompassRoseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21" strokeWidth={1.2} />
      <path d="M12 7l2.4 4.6L12 17l-2.4-5.4L12 7z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Advance / move-to task - an arrow along a route. */
export function ArrowMoveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 17c3-6 7-9 13-11" />
      <path d="M13 5.5 17 6l-.5 4" />
    </Svg>
  );
}

/** Hold / defend / secure task. */
export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.7-7 10-4-2.3-7-5.5-7-10V6l7-3z" />
    </Svg>
  );
}

/** Patrol / observe / screen task. */
export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

/** Orbit / loiter task. */
export function OrbitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="4.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Generic phase / objective marker - fallback when a phase doesn't match a keyword. */
export function FlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v18" />
      <path d="M6 4h11l-2.5 3.5L17 11H6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12.5l5 5L20 6" />
    </Svg>
  );
}

/** Loading state - rotates via CSS class .spin (respects prefers-reduced-motion globally). */
export function SpinnerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </Svg>
  );
}

export function PendingDotIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.2}>
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.2" />
    </Svg>
  );
}

export function WarningTriangleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 21.5 20h-19L12 3.5z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="17.3" r="0.15" fill="currentColor" />
    </Svg>
  );
}

/** Small directional chevron, used for route/convoy-flavored sample icons. */
export function RouteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 18c4 0 4-5 8-5s4 5 8 5" />
      <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function WaveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </Svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="4" width="14" height="17" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" strokeWidth={1.4} />
    </Svg>
  );
}

/** Expand / open-full-screen, used by PlotZoom. */
export function ExpandIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3H3v6M15 21h6v-6M21 9V3h-6M3 15v6h6" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.5 19 12 7 19.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4.5v15M16 4.5v15" strokeWidth={2.4} />
    </Svg>
  );
}

/** Picks a phase icon from its name/description text. Purely a labeling aid -
 * never used to infer or imply anything about targeting or engagement. */
export function iconForPhase(name: string, description: string) {
  const text = `${name} ${description}`.toLowerCase();
  if (/hold|defen|secur|block|screen line|consolidat/.test(text)) return ShieldIcon;
  if (/patrol|observ|screen|recon|surveil|monitor/.test(text)) return EyeIcon;
  if (/orbit|loiter|circl/.test(text)) return OrbitIcon;
  if (/move|advance|approach|maneuver|transit|cross|infiltrat|withdraw/.test(text)) return ArrowMoveIcon;
  return FlagIcon;
}
