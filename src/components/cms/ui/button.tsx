import React from "react";
import clsx from "clsx";

type Variant = "default" | "secondary" | "outline" | "destructive";
type Size = "default" | "sm" | "lg" | "icon";

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
    "inline-flex items-center justify-center rounded-md font-medium text-sm " +
    "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const variants: Record<Variant, string> = {
    default:
      "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400",
    outline:
      "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 focus-visible:ring-gray-400",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  };

  const sizes: Record<Size, string> = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2 w-9 h-9",
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
};
