import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-wire text-oche hover:opacity-90 active:opacity-75",
  secondary: "bg-slate text-chalk border border-wire hover:opacity-90 active:opacity-75",
  ghost: "text-chalk hover:bg-slate active:opacity-75 transition-colors",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", children, className = "", ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          min-h-11 min-w-11 rounded-none font-semibold
          transition-opacity duration-200
          cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
