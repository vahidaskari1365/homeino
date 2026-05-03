import { Link } from "react-router-dom";
import { X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";

const CompareBar = () => {
  const { items, remove, clear } = useCompare();
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl bg-card border border-border rounded-lg shadow-2xl p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Scale size={18} className="text-gold" />
          <span>مقایسه ({items.length})</span>
        </div>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {items.map((it) => (
            <div key={it.id} className="relative flex-shrink-0 w-14 h-14 rounded border border-border overflow-hidden bg-muted">
              {it.image_url ? (
                <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">—</div>
              )}
              <button
                onClick={() => remove(it.id)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>پاک کردن</Button>
          <Button size="sm" asChild disabled={items.length < 2}>
            <Link to="/compare">مقایسه</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;
