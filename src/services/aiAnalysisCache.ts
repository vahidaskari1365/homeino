import { supabase } from "@/integrations/supabase/client";

export type AnalysisType = "visual_search" | "object_match";

interface CacheRow<T> {
  result: T;
}

/**
 * Shared AI analysis cache backed by the `ai_analysis_cache` Supabase table.
 * Cache entries expire after 24 hours.
 *
 * Usage:
 *   const cache = new AiAnalysisCache<AIAnalysisResult>("visual_search");
 *   const hit = await cache.get(fileHash);
 *   if (hit) { /* use cached result * / }
 *   else { /* call Gemini and store result * / }
 */
export class AiAnalysisCache<T = unknown> {
  constructor(private analysisType: AnalysisType) {}

  /**
   * Compute SHA-256 hex digest of a File.
   */
  static async hashFile(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Look up a cached analysis result by file hash.
   * Returns null if not found or expired.
   */
  async get(fileHash: string): Promise<T | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("ai_analysis_cache")
        .select("result")
        .eq("user_id", user.id)
        .eq("file_hash", fileHash)
        .eq("analysis_type", this.analysisType)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error || !data) return null;
      return (data as CacheRow<T>).result;
    } catch {
      return null;
    }
  }

  /**
   * Store a new cache entry (upsert by user_id, file_hash, analysis_type).
   */
  async set(fileHash: string, result: T): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("ai_analysis_cache").upsert(
        {
          user_id: user.id,
          file_hash: fileHash,
          analysis_type: this.analysisType,
          result,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
        { onConflict: "user_id, file_hash, analysis_type" }
      );
    } catch {
      // Silently fail – cache is a performance optimisation, not critical
    }
  }

  /**
   * Invalidate a specific cache entry.
   */
  async invalidate(fileHash: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("ai_analysis_cache")
        .delete()
        .eq("user_id", user.id)
        .eq("file_hash", fileHash)
        .eq("analysis_type", this.analysisType);
    } catch {
      // Silently fail
    }
  }
}
