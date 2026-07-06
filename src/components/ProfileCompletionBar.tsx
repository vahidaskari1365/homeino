import { useProfileCompletion } from "@/hooks/useProfileCompletion";

export function ProfileCompletionBar() {
  const { completion, loading } = useProfileCompletion();

  if (loading || !completion) return null;

  const { score, items } = completion;
  const incomplete = items.filter((i) => !i.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">تکمیل پروفایل</span>
        <span className="text-sm font-bold text-gold">{score}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-gold to-emerald-brand rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      {incomplete.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">برای تکمیل پروفایل:</p>
          {incomplete.slice(0, 3).map((item) => (
            <p key={item.key} className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gold" />
              {item.label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
