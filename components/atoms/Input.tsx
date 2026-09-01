import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, containerClassName = "", className = "", ...props }, ref) => {
    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-chalk mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-1 rounded
            bg-slate text-chalk
            border border-wire
            placeholder-sisal
            focus:ring-2 focus:ring-wire focus:outline-none
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-treble" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-treble text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
