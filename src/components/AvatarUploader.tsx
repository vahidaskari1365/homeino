// ============================================================
// AvatarUploader — reusable drag & drop / click avatar uploader
// ============================================================
// Preview • drag & drop • click to upload • progress bar • success/error •
// retry • remove • replace. Uses the shared useAvatarUpload hook, so there is
// no duplicated upload logic. Previous avatar is preserved on failure.
// ============================================================

import { useCallback, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, Trash2, ImagePlus,
} from "lucide-react";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/imageProcessing";

interface AvatarUploaderProps {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  fallback?: string;
}

export const AvatarUploader = ({
  userId, value, onChange, fallback = "ک",
}: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { status, progress, error, preview, uploading, upload, retry, remove } =
    useAvatarUpload({ userId, onChange });

  const shownSrc = preview || value || undefined;

  const pick = useCallback(() => inputRef.current?.click(), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) void upload(file);
    },
    [upload, uploading],
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4" dir="rtl">
      <Avatar className="h-20 w-20 border-2 border-gold/30 shrink-0">
        <AvatarImage src={shownSrc} alt="آواتار" className="object-cover" />
        <AvatarFallback className="bg-gold text-primary-foreground text-2xl font-bold">
          {fallback.slice(0, 1)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 w-full space-y-2">
        {/* Drop / click zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          aria-label="آپلود تصویر پروفایل"
          className={`flex items-center justify-center gap-2 w-full rounded-xl border border-dashed px-4 py-4 text-sm cursor-pointer transition-colors ${
            dragOver
              ? "border-gold bg-gold/10 text-gold"
              : "border-border bg-background text-muted-foreground hover:bg-accent"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> در حال آپلود…</>
          ) : (
            <><ImagePlus size={16} /> تصویر را بکشید و رها کنید یا برای انتخاب کلیک کنید</>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />

        {uploading && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-[11px] text-muted-foreground">{progress}%</p>
          </div>
        )}

        {status === "success" && (
          <p className="text-xs text-emerald-brand flex items-center gap-1">
            <CheckCircle2 size={13} /> تصویر با موفقیت بارگذاری شد
          </p>
        )}

        {status === "error" && error && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={13} /> {error}
            </p>
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => void retry()}>
              <RefreshCw size={12} /> تلاش مجدد
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" disabled={uploading} onClick={pick}>
            <Upload size={13} /> {value ? "تغییر تصویر" : "بارگذاری تصویر"}
          </Button>
          {value && (
            <Button
              type="button" size="sm" variant="outline"
              className="gap-1 text-xs text-destructive hover:text-destructive"
              disabled={uploading}
              onClick={() => void remove()}
            >
              <Trash2 size={13} /> حذف تصویر
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          فرمت‌های مجاز: JPG، PNG، WEBP — حداکثر ۵ مگابایت
        </p>
      </div>
    </div>
  );
};

export default AvatarUploader;
