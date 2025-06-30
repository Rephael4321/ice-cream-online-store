import React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = ({ className = "", ...props }: LabelProps) => {
  return (
    <label
      className={`block mb-1 font-medium text-sm ${className}`}
      {...props}
    />
  );
};
