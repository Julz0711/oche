import React from "react";

type NumeralSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
type NumeralVariant = "default" | "accent" | "danger" | "success";

interface NumeralProps {
  value: number | string;
  size?: NumeralSize;
  variant?: NumeralVariant;
  tabular?: boolean;
  className?: string;
}

const sizeClasses: Record<NumeralSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

const variantClasses: Record<NumeralVariant, string> = {
  default: "text-chalk",
  accent: "text-wire",
  danger: "text-treble",
  success: "text-double",
};

export const Numeral = React.forwardRef<HTMLSpanElement, NumeralProps>(
  (
    {
      value,
      size = "md",
      variant = "default",
      tabular = true,
      className = "",
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={`
          font-display font-bold
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${tabular ? "tabular-nums" : ""}
          ${className}
        `}
      >
        {value}
      </span>
    );
  }
);

Numeral.displayName = "Numeral";
