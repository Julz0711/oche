import React from "react";
import { X } from "lucide-react";

type ChipVariant = "default" | "success" | "danger" | "accent";

interface ChipProps {
  label: string;
  value?: string | number;
  variant?: ChipVariant;
  onClose?: () => void;
  className?: string;
}

/* `bg-opacity-*` is Tailwind v3 and does nothing in v4 — these were opaque fills, not the
   20% washes they read as. The slash syntax is the v4 equivalent. */
const variantClasses: Record<ChipVariant, string> = {
  default: "bg-slate text-chalk border border-wire",
  success: "bg-double/20 text-double border border-double",
  danger: "bg-treble/20 text-treble border border-treble",
  accent: "bg-wire/20 text-wire border border-wire",
};

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ label, value, variant = "default", onClose, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          inline-flex items-center gap-2
          px-3 py-1 text-sm
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {label}
        {value !== undefined && <span className="font-semibold">{value}</span>}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-1 inline-flex items-center justify-center hover:opacity-70 active:opacity-50 transition-opacity cursor-pointer"
            aria-label={`Remove ${label}`}
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = "Chip";
