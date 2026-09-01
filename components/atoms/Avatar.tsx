import React from "react";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  image?: string;
  size?: AvatarSize;
  isActive?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, image, size = "md", isActive = false, className = "" }, ref) => {
    const initials = getInitials(name);

    return (
      <div
        ref={ref}
        className={`
          flex items-center justify-center
          rounded-full font-semibold
          ${sizeClasses[size]}
          ${isActive ? "bg-wire text-oche border-2 border-chalk" : "bg-slate text-chalk"}
          ${className}
        `}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          initials
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";
