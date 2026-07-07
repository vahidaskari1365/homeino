import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface ProgressStep {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
}

interface AIDesignProgressProps {
  steps: ProgressStep[];
  currentLabel?: string;
}

const AIDesignProgress = ({ steps, currentLabel }: AIDesignProgressProps) => {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {currentLabel && (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin text-accent shrink-0" size={16} />
          <span className="font-medium text-accent">{currentLabel}</span>
        </div>
      )}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-3">
            <div className="shrink-0">
              {step.done ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : step.active ? (
                <Loader2 size={16} className="animate-spin text-accent" />
              ) : (
                <Circle size={16} className="text-muted-foreground/30" />
              )}
            </div>
            <span
              className={`text-sm ${
                step.done
                  ? "text-emerald-600 font-medium"
                  : step.active
                  ? "text-accent font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${
                step.done ? "bg-emerald-200" : "bg-border"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIDesignProgress;
