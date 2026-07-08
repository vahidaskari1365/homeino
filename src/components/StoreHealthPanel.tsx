import { useState } from "react";
import { useStoreHealth } from "@/hooks/useStoreHealth";
import { healthService, type HealthSuggestion } from "@/services/healthService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props { storeId: string; }

export function StoreHealthPanel({ storeId }: Props) {
  const { health, loading, runCheck } = useStoreHealth(storeId);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    await runCheck();
    setRunning(false);
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gold" /></div>;

  const suggestions: HealthSuggestion[] = health?.suggestions ? (typeof health.suggestions === "string" ? JSON.parse(health.suggestions as string) : health.suggestions as unknown as HealthSuggestion[]) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <AlertTriangle size={18} className="text-gold" />
          سلامت فروشگاه
        </h3>
        <Button variant="outline" size="sm" onClick={handleRun} disabled={running} className="gap-1">
          {running ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          بررسی
        </Button>
      </div>

      {health && (
        <div className="flex items-center gap-3 p-3 rounded-lg border" dir="ltr">
          <div className={`text-2xl font-bold ${healthService.getScoreColor(health.overall_score)}`}>
            {health.overall_score}
          </div>
          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                health.overall_score >= 80 ? "bg-emerald-brand" :
                health.overall_score >= 60 ? "bg-gold" :
                health.overall_score >= 40 ? "bg-orange-500" : "bg-destructive"
              }`}
              style={{ width: `${health.overall_score}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">از ۱۰۰</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <Card key={i} className={`p-3 border ${healthService.getSeverityColor(s.severity)}`}>
              <div className="flex items-start gap-2">
                {s.severity === "critical" || s.severity === "high"
                  ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-medium">{s.message}</p>
                  <p className="text-xs opacity-80 mt-1">{s.action}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {health && suggestions.length === 0 && (
        <div className="text-center py-4 text-emerald-brand">
          <CheckCircle2 size={32} className="mx-auto mb-2" />
          <p className="text-sm font-medium">فروشگاه شما در وضعیت عالی قرار دارد</p>
        </div>
      )}
    </div>
  );
}
