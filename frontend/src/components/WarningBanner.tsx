import type { ReactNode } from "react";

import { WarningTriangleIcon } from "./icons";

interface Props {
  children: ReactNode;
}

export function WarningBanner({ children }: Props) {
  return (
    <div className="warning-banner">
      <WarningTriangleIcon size={16} />
      <span>{children}</span>
    </div>
  );
}
