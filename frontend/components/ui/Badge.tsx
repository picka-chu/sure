import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-[#e9e9e7] text-[#37352f]",
    success: "bg-[#dff6dd] text-[#0f7b0f]",
    danger: "bg-[#fde7e5] text-[#c73c3c]",
    warning: "bg-[#fef3d0] text-[#9f6d00]",
    info: "bg-[#ddeeff] text-[#115ce9]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
