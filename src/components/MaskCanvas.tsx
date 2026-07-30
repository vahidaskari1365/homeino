import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, Paintbrush, RotateCcw, Check, ZoomIn, ZoomOut } from "lucide-react";

interface MaskCanvasProps {
  imageBase64: string;
  onMaskGenerated: (maskBase64: string) => void;
  onCancel: () => void;
}

const MaskCanvas = ({ imageBase64, onMaskGenerated, onCancel }: MaskCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isErasing, setIsErasing] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Draw the original image on the background canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas to display size
      const container = containerRef.current;
      if (container) {
        const maxW = container.clientWidth;
        const maxH = container.clientHeight;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      }

      // Initialize overlay canvas (transparent)
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        const octx = overlay.getContext("2d");
        if (octx) {
          octx.clearRect(0, 0, overlay.width, overlay.height);
        }
      }
    };
    img.src = imageBase64;
  }, [imageBase64]);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const overlay = overlayRef.current;
      if (!overlay) return { x: 0, y: 0 };
      const rect = overlay.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (overlay.width / rect.width),
        y: (clientY - rect.top) * (overlay.height / rect.height),
      };
    },
    [],
  );

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    drawAt(clientX, clientY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    drawAt(clientX, clientY);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawAt = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const octx = overlay.getContext("2d");
    if (!octx) return;

    const { x, y } = getCanvasCoords(clientX, clientY);

    if (isErasing) {
      octx.globalCompositeOperation = "destination-out";
      octx.beginPath();
      octx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      octx.fill();
      octx.globalCompositeOperation = "source-over";
    } else {
      octx.fillStyle = "rgba(255, 255, 255, 0.9)";
      octx.beginPath();
      octx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      octx.fill();
    }
  };

  const clearMask = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const octx = overlay.getContext("2d");
    if (!octx) return;
    octx.clearRect(0, 0, overlay.width, overlay.height);
  };

  const generateMask = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    // Create a mask image: white for painted areas, black for untouched
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = overlay.width;
    maskCanvas.height = overlay.height;
    const mctx = maskCanvas.getContext("2d");
    if (!mctx) return;

    // Fill with black
    mctx.fillStyle = "#000000";
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Copy painted areas from overlay (white) to mask
    mctx.drawImage(overlay, 0, 0);

    onMaskGenerated(maskCanvas.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsErasing(false)}
            className={`p-2 rounded-lg transition-all ${!isErasing ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-card/80"}`}
            title="قلم مو"
          >
            <Paintbrush size={18} />
          </button>
          <button
            onClick={() => setIsErasing(true)}
            className={`p-2 rounded-lg transition-all ${isErasing ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-card/80"}`}
            title="پاک‌کن"
          >
            <Eraser size={18} />
          </button>
          <div className="w-px h-6 bg-border mx-2" />
          <button
            onClick={() => setBrushSize((s) => Math.max(5, s - 5))}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title="کوچک کردن قلم"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{brushSize}px</span>
          <button
            onClick={() => setBrushSize((s) => Math.min(100, s + 5))}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title="بزرگ کردن قلم"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearMask}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title="پاک کردن ماسک"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative bg-muted rounded-2xl overflow-hidden cursor-crosshair"
        style={{ minHeight: 300, maxHeight: 600 }}
      >
        {/* Background: original image */}
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        {/* Overlay: user's mask */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        روی نواحی که می‌خواهید تغییر کنند بکشید (سفید رنگ شود). نواحی مشکی保持不变 می‌مانند.
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-card border border-border hover:border-destructive/50 text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
        >
          انصراف
        </button>
        <button
          onClick={generateMask}
          className="flex-1 bg-accent text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-accent/90 text-sm"
        >
          <Check size={18} /> تأیید ماسک و طراحی
        </button>
      </div>
    </div>
  );
};

export default MaskCanvas;