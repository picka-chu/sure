"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-[#115ce9] text-white hover:bg-[#0d4fcc] active:bg-[#0a3d9e] rounded-[3px]",
      secondary:
        "bg-[#e9e9e7] text-[#37352f] hover:bg-[#dcdcd9] active:bg-[#d0d0cd] rounded-[3px]",
      outline:
        "border border-[#e9e9e7] text-[#37352f] hover:bg-[#f7f7f7] active:bg-[#efefef] rounded-[3px]",
      ghost:
        "text-[#787774] hover:bg-[#f7f7f7] hover:text-[#37352f] rounded-[3px]",
      danger:
        "bg-[#e03e3e] text-white hover:bg-[#c73c3c] active:bg-[#ae3737] rounded-[3px]",
    };

    const sizes = {
      sm: "px-2.5 py-1 text-[13px] gap-1.5",
      md: "px-3 py-1.5 text-[14px] gap-2",
      lg: "px-4 py-2 text-[15px] gap-2",
      xl: "px-5 py-2.5 text-[16px] gap-3",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
