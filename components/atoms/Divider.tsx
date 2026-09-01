import React from "react";

type DividerDirection = "horizontal" | "vertical";
type DividerColor = "default" | "muted";

interface DividerProps {
  direction?: DividerDirection;
  color?: DividerColor;
  className?: string;
}

const colorClasses: Record<DividerColor, string> = {
  default: "border-wire",
  muted: "border-slate",
};

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ direction = "horizontal", color = "default", className = "" }, ref) => {
    const isHorizontal = direction === "horizontal";

    return (
      <div
        ref={ref}
        className={`
          ${isHorizontal ? "w-full border-t" : "h-full border-l"}
          ${colorClasses[color]}
          ${className}
        `}
      />
    );
  }
);

Divider.displayName = "Divider";
