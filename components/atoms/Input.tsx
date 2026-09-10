import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, containerClassName = "", className = "", ...props }, ref) => {
    const generatedId = React.useId();
    const id = props.id ?? generatedId;
    const errorId = `${id}-error`;
    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-chalk mb-1">
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
          id={id}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={[props["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
        />
        {error && <p id={errorId} className="text-treble text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
