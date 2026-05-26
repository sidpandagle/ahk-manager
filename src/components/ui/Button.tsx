import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "success" | "danger" | "";
  size?: "sm" | "";
  iconOnly?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant,
  size,
  iconOnly,
  leftIcon,
  rightIcon,
  className,
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    variant,
    size,
    iconOnly ? "icon-only" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
