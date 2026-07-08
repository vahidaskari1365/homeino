import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatPersianDate } from "@/lib/date";
import StarRating from "@/StarRating"; // Note: It is imported as StarRating from @/components/StarRating in original. Let's see original imports: import StarRating from "@/components/StarRating";
import StarRatingComponent from "@/components/StarRating";
import { Trash2, MessageSquare, Check, Star, ArrowUpDown } from "lucide-react";
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
  is_verified_purchase?: boolean;
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
  const [isVerified, setIsVerified] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkVerification = useCallback(async (uid: string) => {
    try {
      if (targetType === "product") {
        const { data } = await supabase
          .from("order_items")
          .select("id, orders!inner(customer_id, status)")
          .eq("product_id", targetId)
          .eq("orders.customer_id", uid)
          .limit(1);
        return !!data?.length;
      } else {
        const { data } = await supabase
          .from("orders")
          .select("id")
          .eq("profile_id", targetId)
          .eq("customer_id", uid)
          .limit(1);
        return !!data?.length;
      }
    } catch {
      return false;
    }
  }, [targetId, targetType]);

  useEffect(() => {
    if (session?.user?.id) {
      checkVerification(session.user.id).then(setIsVerified);
    }
  }, [session?.user?.id, checkVerification]);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, user_id, rating, title, body, created_at, is_verified_purchase")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: false });
    setReviews((data as Review[]) || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  const myReview = session ? reviews.find((r) => r.user_id === session.user.id) : null;

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title || "");
      setBody(myReview.body || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      is_verified_purchase: isVerified,
    };
    const { error } = await supabase
      .from("reviews")
      .upsert(payload, { onConflict: "user_id,target_type,target_id" });
    setSubmitting(false);
    if (!error) {
      toast({ title: "ثبت شد", description: "نظر شما با موفقیت ثبت شد" });
      
      // Create notification for seller
      await supabase.rpc("create_notification", {
        _user_id: profileId,
        _title: "نظر جدید",
        _body: `یک نظر جدید برای ${targetType === 'product' ? 'محصول' : 'فروشگاه'} شما ثبت شد.`,
        _type: "review_new",
        _link: targetType === 'product' ? `/shops/${profileId}` : `/shops/${targetId}`,
        _metadata: { target_id: targetId, target_type: targetType }
      });

      load();
    }
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

  // Rating distribution calculation (1 to 5 stars)
  const stats = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0, 0]; // Indices correspond to stars (1 to 5)
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating]++;
      }
    });
    return distribution;
  }, [reviews]);

  // Client-side sorting for super-fast UX
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (sortBy === "newest") {
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (sortBy === "highest") {
      return list.sort((a, b) => b.rating - a.rating);
    }
    if (sortBy === "lowest") {
      return list.sort((a, b) => a.rating - b.rating);
    }
    return list;
  }, [reviews, sortBy]);

  return (
    <section className="mt-8" dir="rtl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-xl font-display font-bold flex items-center gap-2">
          <MessageSquare className="text-gold" size={20} />
          نظرات و امتیازها ({reviews.length.toLocaleString("en-US")})
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRatingComponent value={Math.round(avg)} readOnly size={16} />
            <span className="text-sm text-muted-foreground">{avg.toFixed(1).toLocaleString("en-US")} از ۵</span>
          </div>
        )}
      </div>

      {/* Review Breakdown & Statistics Summary */}
      {reviews.length > 0 && (
        <Card className="mb-6 overflow-hidden bg-muted/20 border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Overall Score */}
              <div className="text-center md:border-l md:border-border">
                <span className="text-5xl font-extrabold text-foreground">{avg.toFixed(1).toLocaleString("en-US")}</span>
                <div className="flex justify-center my-2">
                  <StarRatingComponent value={Math.round(avg)} readOnly size={20} />
                </div>
                <p className="text-xs text-muted-foreground">
                  براساس {reviews.length.toLocaleString("en-US")} امتیاز ثبت شده
                </p>
              </div>

              {/* Progress Bars Distribution */}
              <div className="md:col-span-2 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats[star];
                  const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="w-12 text-right flex items-center gap-1">
                        <span className="font-semibold">{star.toLocaleString("en-US")}</span>
                        <Star size={12} className="text-gold fill-gold shrink-0" />
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gold rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-left flex justify-between font-mono text-[10px]">
                        <span>{Math.round(percentage).toLocaleString("en-US")}٪</span>
                        <span className="text-muted-foreground/60">({count.toLocaleString("en-US")})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {session ? (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={submit} className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">امتیاز شما:</span>
                <StarRatingComponent value={rating} onChange={setRating} size={22} />
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

      {/* Sorting Control Header */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <span className="text-sm text-muted-foreground font-medium">نظرات کاربران</span>
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">مرتب‌سازی براساس:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-8 text-xs font-semibold">
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="newest" className="text-xs">جدیدترین‌ها</SelectItem>
                <SelectItem value="highest" className="text-xs">بالاترین امتیاز</SelectItem>
                <SelectItem value="lowest" className="text-xs">پایین‌ترین امتیاز</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">هنوز نظری ثبت نشده است</p>
        ) : (
          sortedReviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <StarRatingComponent value={r.rating} readOnly size={14} />
                    {r.is_verified_purchase && (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                        <Check size={10} /> خرید تایید شده
                      </span>
                    )}
                  </div>
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
