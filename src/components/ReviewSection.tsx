import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { formatPersianDate } from "@/lib/date";
import StarRating from "@/components/StarRating";
import { Trash2, MessageSquare } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface Props {
  targetType: "product" | "shop";
  targetId: string;
  profileId: string;
}

type Review = {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

const schema = z.object({
  rating: z.number().int().min(1, "امتیاز را انتخاب کنید").max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().max(1000).optional(),
});

const ReviewSection = ({ targetType, targetId, profileId }: Props) => {
  const [session, setSession] = useState<Session | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, user_id, rating, title, body, created_at")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: false });
    setReviews((data as Review[]) || []);
  };

  useEffect(() => {
    load();
  }, [targetType, targetId]);

  const myReview = session ? reviews.find((r) => r.user_id === session.user.id) : null;

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title || "");
      setBody(myReview.body || "");
    }
  }, [myReview?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const parsed = schema.safeParse({ rating, title, body });
    if (!parsed.success) {
      toast({ title: "خطا", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = {
      user_id: session.user.id,
      target_type: targetType,
      target_id: targetId,
      profile_id: profileId,
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
    };
    const { error } = await supabase
      .from("reviews")
      .upsert(payload, { onConflict: "user_id,target_type,target_id" });
    setSubmitting(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ثبت شد", description: "نظر شما با موفقیت ثبت شد" });
    load();
  };

  const remove = async () => {
    if (!myReview) return;
    const { error } = await supabase.from("reviews").delete().eq("id", myReview.id);
    if (!error) {
      setRating(0); setTitle(""); setBody("");
      load();
    }
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-xl font-display font-bold flex items-center gap-2">
          <MessageSquare className="text-gold" size={20} />
          نظرات و امتیازها ({reviews.length})
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(avg)} readOnly size={16} />
            <span className="text-sm text-muted-foreground">{avg.toFixed(1)} از ۵</span>
          </div>
        )}
      </div>

      {session ? (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={submit} className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">امتیاز شما:</span>
                <StarRating value={rating} onChange={setRating} size={22} />
              </div>
              <Input
                placeholder="عنوان (اختیاری)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <Textarea
                placeholder={targetType === "shop" ? "تجربه خرید خود را بنویسید..." : "نظر خود را درباره این محصول بنویسید..."}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1000}
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="gradient-gold text-primary-foreground">
                  {myReview ? "بروزرسانی نظر" : "ثبت نظر"}
                </Button>
                {myReview && (
                  <Button type="button" variant="outline" onClick={remove}>
                    <Trash2 size={14} /> حذف نظر من
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-6 p-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground text-center">
          برای ثبت نظر باید <Link to="/auth" className="text-gold hover:underline">وارد شوید</Link>
        </div>
      )}

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">هنوز نظری ثبت نشده است</p>
        ) : (
          reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <StarRating value={r.rating} readOnly size={14} />
                  <span className="text-xs text-muted-foreground">{formatPersianDate(r.created_at)}</span>
                </div>
                {r.title && <h4 className="font-semibold text-foreground mb-1">{r.title}</h4>}
                {r.body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{r.body}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
};

export default ReviewSection;
