import React from "react";

interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  on: boolean;
  onChange?: (val: boolean) => void;
}

export function Toggle({ on, onChange, ...rest }: ToggleProps) {
  return (
    <button
      className={"tgl " + (on ? "on" : "")}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!on);
      }}
      aria-pressed={on}
      type="button"
      {...rest}
    />
  );
}
