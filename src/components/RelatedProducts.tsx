import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";

interface ProductItem {
  id: string;
  product_id?: string;
  product?: {
    id: string;
    name: string;
    price: number | null;
    image_url: string | null;
  } | null;
}

interface RelatedProductsProps {
  products: ProductItem[];
  title?: string;
}

const RelatedProducts = ({ products, title = "محصولات مرتبط" }: RelatedProductsProps) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShoppingBag className="text-primary" size={20} /> {title}
      </h3>
      <div className="space-y-4">
        {products.map((item) => {
          const p = item.product;
          if (!p) return null;
          const pid = p.id || item.product_id;
          return (
            <div
              key={item.id || pid}
              className="flex items-center gap-4 p-2 rounded-2xl hover:bg-muted transition-colors group"
            >
              <Link to={`/product/${pid}`}>
                <img
                  src={p.image_url || ""}
                  alt={p.name}
                  className="w-16 h-16 object-cover rounded-xl shadow-sm"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${pid}`}>
                  <h4 className="font-bold text-xs line-clamp-1 group-hover:text-primary transition-colors">
                    {p.name}
                  </h4>
                </Link>
                <p className="text-[11px] text-primary font-bold mt-0.5">
                  {p.price ? `${p.price.toLocaleString()} تومان` : "مشاهده قیمت"}
                </p>
                <ViewInMyRoomButton
                  productId={pid}
                  productName={p.name}
                  productImage={p.image_url}
                  productPrice={p.price}
                  variant="full"
                  className="mt-1"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedProducts;
