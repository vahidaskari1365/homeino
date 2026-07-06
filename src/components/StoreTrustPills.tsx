import { useTrustScore } from "@/hooks/useTrustScore";
import { trustService } from "@/services/trustService";
import { ShieldCheck, Crown, Sparkles, Star, Loader2 } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "shield-check": ShieldCheck,
  crown: Crown,
  sparkles: Sparkles,
  star: Star,
};

interface Props {
  storeId: string;
  size?: "sm" | "xs";
}

export function StoreTrustPills({ storeId, size = "sm" }: Props) {
  const { score, loading } = useTrustScore(storeId);

  if (loading) return null;
  if (!score?.badges || score.badges.length === 0) return null;

  const visibleBadges = ["verified", "premium", "ai_optimized", "top_rated"];
  const displayBadges = score.badges.filter((s) => visibleBadges.includes(s));

  if (displayBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayBadges.map((slug) => {
        const meta = trustService.getBadgeMeta(slug);
        const Icon = ICON_MAP[slug] || ShieldCheck;
        const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5 gap-0.5" : "text-xs px-2 py-0.5 gap-1";
        const iconSize = size === "xs" ? 10 : 12;
        return (
          <span
            key={slug}
            className={`inline-flex items-center rounded-full border bg-background font-medium ${meta.color} ${sizeClass}`}
            title={meta.label}
          >
            <Icon size={iconSize} />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
