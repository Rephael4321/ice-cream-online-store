import React from "react";
import clsx from "clsx";

type Variant = "default" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = ({
  className = "",
  variant = "default",
  ...props
}: ButtonProps) => {
  const base =
    "px-4 py-2 rounded-md transition-colors disabled:opacity-50 text-sm";

  const variants: Record<Variant, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100",
  };

  return (
    <button className={clsx(base, variants[variant], className)} {...props} />
  );
};
