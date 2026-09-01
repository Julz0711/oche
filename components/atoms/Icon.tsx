import React from "react";
import { LucideProps } from "lucide-react";

interface IconProps extends Omit<LucideProps, "ref"> {
  icon: React.ComponentType<LucideProps>;
  size?: number;
  color?: string;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size = 24, color = "currentColor", ...props }, ref) => {
    return <IconComponent ref={ref} size={size} color={color} {...props} />;
  }
);

Icon.displayName = "Icon";
