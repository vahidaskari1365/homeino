import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Purpose = "renovation" | "interior_design" | "bulk_purchase" | "other";

interface Props {
  profile_id: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
}

const purposeLabels: Record<Purpose, string> = {
  renovation: "بازسازی خانه",
  interior_design: "طراحی داخلی",
  bulk_purchase: "خرید عمده",
  other: "سایر",
};

const SiteVisitDialog = ({ profile_id, label = "رزرو بازدید حضوری", variant = "outline", size = "default", fullWidth }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>("renovation");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "ابتدا وارد شوید", variant: "destructive" });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast({ title: "نام و تلفن الزامی است", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("site_visits").insert({
      customer_id: user.id,
      profile_id,
      purpose,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      city: city.trim() || null,
      address: address.trim() || null,
      preferred_date: date || null,
      preferred_time_range: timeRange.trim() || null,
      description: description.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "خطا در ثبت", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ثبت شد", description: "درخواست بازدید شما ارسال شد." });
    setOpen(false);
    setName(""); setPhone(""); setCity(""); setAddress(""); setDate(""); setTimeRange(""); setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={`gap-1 ${fullWidth ? "w-full" : ""}`}>
          <CalendarCheck size={16} /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>رزرو بازدید حضوری</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>هدف بازدید</Label>
            <Select value={purpose} onValueChange={(v) => setPurpose(v as Purpose)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(purposeLabels) as Purpose[]).map((k) => (
                  <SelectItem key={k} value={k}>{purposeLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نام و نام خانوادگی</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label>شماره تماس</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </div>
            <div>
              <Label>شهر</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={50} />
            </div>
            <div>
              <Label>تاریخ پیشنهادی</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>بازه ساعتی (مثلاً 10 تا 13)</Label>
              <Input value={timeRange} onChange={(e) => setTimeRange(e.target.value)} maxLength={50} />
            </div>
            <div className="col-span-2">
              <Label>آدرس</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
            </div>
            <div className="col-span-2">
              <Label>توضیحات</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={loading} className="gradient-gold text-primary-foreground">
            {loading ? "در حال ارسال..." : "ثبت درخواست"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SiteVisitDialog;
