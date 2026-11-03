import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "size-7 text-xs", md: "size-8 text-sm", lg: "size-10 text-base" };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const classes = cn("shrink-0 rounded-full", sizes[size], className);
  if (src) {
    // Google avatar URLs are already sized; next/image would need remotePatterns for no benefit here.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} referrerPolicy="no-referrer" className={cn(classes, "object-cover")} />;
  }
  return (
    <span aria-hidden className={cn(classes, "flex items-center justify-center bg-brand font-semibold text-white")}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
