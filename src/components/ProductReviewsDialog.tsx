import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import ReviewSection from "./ReviewSection";

interface Props {
  productId: string;
  profileId: string;
  productName: string;
}

const ProductReviewsDialog = ({ productId, profileId, productName }: Props) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <MessageSquare size={14} /> نظرات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>نظرات: {productName}</DialogTitle>
        </DialogHeader>
        <ReviewSection targetType="product" targetId={productId} profileId={profileId} />
      </DialogContent>
    </Dialog>
  );
};

export default ProductReviewsDialog;
