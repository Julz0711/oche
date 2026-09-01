import React from "react";
import { X } from "lucide-react";

type ChipVariant = "default" | "success" | "danger" | "accent";

interface ChipProps {
  label: string;
  value: string | number;
  variant?: ChipVariant;
  onClose?: () => void;
  className?: string;
}

const variantClasses: Record<ChipVariant, string> = {
  default: "bg-slate text-chalk border border-wire",
  success: "bg-double bg-opacity-20 text-double border border-double",
  danger: "bg-treble bg-opacity-20 text-treble border border-treble",
  accent: "bg-wire bg-opacity-20 text-wire border border-wire",
};

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ label, value, variant = "default", onClose, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          inline-flex items-center gap-2
          rounded-full px-3 py-1 text-sm
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {label}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-1 inline-flex items-center justify-center rounded-full hover:opacity-70 active:opacity-50 transition-opacity cursor-pointer"
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
