import { badgeService } from "@/services/badgeService";
type BadgeDefinition = { icon: string; name: string; [k: string]: unknown };
import {
  Award, PenTool, Layers, Heart, Megaphone, CheckCircle,
  ShieldCheck, Crown, Sparkles, Star, TrendingUp, BadgeCheck,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "pen-tool": PenTool, layers: Layers, award: Award, heart: Heart,
  megaphone: Megaphone, "check-circle": CheckCircle, "shield-check": ShieldCheck,
  crown: Crown, sparkles: Sparkles, star: Star, "trending-up": TrendingUp,
  "badge-check": BadgeCheck,
};

interface Props {
  badge: BadgeDefinition;
  earned?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BadgeDisplay({ badge, earned = true, size = "md" }: Props) {
  const Icon = ICON_MAP[badge.icon] ?? Award;
  const sizeClass = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";

  return (
    <div className={`flex flex-col items-center gap-1 ${!earned ? "opacity-40" : ""}`}>
      <div className={`${sizeClass} rounded-full flex items-center justify-center border-2 ${
        earned ? "border-gold bg-gold/10 text-gold" : "border-border bg-muted text-muted-foreground"
      }`}>
        <Icon size={size === "sm" ? 14 : size === "lg" ? 24 : 18} />
      </div>
      <span className={`text-center text-xs leading-tight ${earned ? "text-foreground" : "text-muted-foreground"}`}>
        {badge.name}
      </span>
    </div>
  );
}
