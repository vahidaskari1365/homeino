import { useState, useRef } from "react";
import { Check, Sparkles } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  onConfirm?: () => void;
  onPolish?: () => void;
  polishing?: boolean;
}

const BeforeAfterSlider = ({ beforeImage, afterImage, onConfirm, onPolish, polishing }: BeforeAfterSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(position);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) { // Left mouse button pressed
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm?.();
  };

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="relative w-full aspect-video overflow-hidden rounded-2xl cursor-ew-resize select-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseDown={(e) => handleMove(e.clientX)}
      >
        {/* After Image (Background) */}
        <img 
          src={afterImage} 
          alt="After" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Before Image (Foreground, Clipped) */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={beforeImage} 
            alt="Before" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Slider Line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-1">
              <div className="w-0.5 h-3 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-3 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded border border-white/20 z-20 pointer-events-none">
          بعد (طراحی جدید)
        </div>
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded border border-white/20 z-20 pointer-events-none">
          قبل
        </div>

        {/* Confirm/Polish overlay actions */}
        {(onConfirm || onPolish) && !polishing && (
          <div className="absolute top-4 right-4 left-4 flex items-center justify-center gap-3 z-30">
            {onConfirm && (
              <button
                onClick={handleConfirm}
                disabled={confirmed}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                  confirmed
                    ? "bg-emerald-500 text-white"
                    : "bg-white/90 text-gray-900 hover:bg-white"
                }`}
              >
                <Check size={14} />
                {confirmed ? "تأیید شد ✓" : "تأیید طراحی"}
              </button>
            )}
            {onPolish && (
              <button
                onClick={onPolish}
                disabled={polishing}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-white/90 text-gray-900 hover:bg-white shadow-lg transition-all"
              >
                <Sparkles size={14} />
                {polishing ? "در حال بهبود..." : "بهبود جزئیات"}
              </button>
            )}
          </div>
        )}

        {/* Polish loading overlay */}
        {polishing && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="bg-card/90 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
              <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-foreground">بهبود جزئیات طراحی...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterSlider;