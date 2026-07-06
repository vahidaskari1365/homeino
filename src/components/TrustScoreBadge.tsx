import { useTrustScore } from "@/hooks/useTrustScore";
import { trustService } from "@/services/trustService";
import { Card } from "@/components/ui/card";
import { Shield, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props { storeId: string; showRecalculate?: boolean; }

export function TrustScoreBadge({ storeId, showRecalculate }: Props) {
  const { score, loading, recalculate } = useTrustScore(storeId);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const handleRecalc = async () => {
    setRecalcLoading(true);
    await recalculate();
    setRecalcLoading(false);
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gold" /></div>;
  if (!score) return null;

  return (
    <Card className="p-4 border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <Shield size={18} className="text-gold" />
          امتیاز اعتماد
        </h3>
        {showRecalculate && (
          <Button variant="ghost" size="sm" onClick={handleRecalc} disabled={recalcLoading}>
            <RefreshCw size={14} className={recalcLoading ? "animate-spin" : ""} />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4" dir="ltr">
        <div className={`text-3xl font-bold ${score.overall_score >= 80 ? "text-emerald-brand" : score.overall_score >= 60 ? "text-gold" : score.overall_score >= 40 ? "text-orange-500" : "text-destructive"}`}>
          {score.overall_score}
        </div>
        <div className="flex-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                score.overall_score >= 80 ? "bg-emerald-brand" :
                score.overall_score >= 60 ? "bg-gold" :
                score.overall_score >= 40 ? "bg-orange-500" : "bg-destructive"
              }`}
              style={{ width: `${score.overall_score}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{trustService.getScoreLabel(score.overall_score)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${score.profile_completed ? "bg-emerald-brand" : "bg-muted"}`} />
          <span>پروفایل</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${score.has_verified_info ? "bg-emerald-brand" : "bg-muted"}`} />
          <span>تأیید شده</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${score.has_active_subscription ? "bg-emerald-brand" : "bg-muted"}`} />
          <span>اشتراک</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-brand" />
          <span>کیفیت: {score.product_quality_score}%</span>
        </div>
      </div>

      {score.badges && score.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
          {score.badges.map((slug) => {
            const meta = trustService.getBadgeMeta(slug);
            return (
              <span key={slug} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta.color} bg-background`}>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </Card>
  );
}
