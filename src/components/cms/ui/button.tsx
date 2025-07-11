import React from "react";
import clsx from "clsx";

type Variant = "default" | "outline" | "destructive";
type Size = "default" | "sm" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = ({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) => {
  const base =
    "rounded-md transition-colors disabled:opacity-50 text-sm font-medium";

const variants: Record<Variant, string> = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100",
  destructive: "bg-red-600 text-white hover:bg-red-700", // ✅ Add this line
};


  const sizes: Record<Size, string> = {
    default: "px-4 py-2",
    sm: "px-3 py-1 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
};
