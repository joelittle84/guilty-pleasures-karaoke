import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    const variants = {
      primary: "bg-primary text-white shadow-[0_0_20px_-5px_hsl(var(--primary))] hover:shadow-[0_0_25px_0px_hsl(var(--primary))] border border-primary/50",
      secondary: "bg-secondary text-black shadow-[0_0_20px_-5px_hsl(var(--secondary))] hover:shadow-[0_0_25px_0px_hsl(var(--secondary))] border border-secondary/50",
      outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_-5px_hsl(var(--primary))]",
      ghost: "bg-transparent hover:bg-white/5 text-muted-foreground hover:text-white",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg font-bold tracking-wide",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "relative rounded-xl font-display font-semibold transition-all duration-300 ease-out active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
NeonButton.displayName = "NeonButton";
