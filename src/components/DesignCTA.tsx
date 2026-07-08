import { Link } from "react-router-dom";
import { Sparkles, Search, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

const DesignCTA = () => {
  return (
    <div className="bg-gradient-to-br from-primary/10 via-gold/5 to-card rounded-3xl p-8 border border-primary/20 shadow-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center shadow-luxury">
          <Sparkles size={28} className="text-primary-foreground" />
        </div>
        <h3 className="text-2xl font-black">مشاهده در خانه من</h3>
        <p className="text-muted-foreground max-w-md">
          این طرح را در خانه خودتان ببینید! با هوش مصنوعی هومینو، تصور کنید این دکوراسیون در فضای شما چگونه خواهد بود.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <Link to="/ai-design">
            <Button className="gradient-gold shadow-luxury gap-2 px-6">
              <Sparkles size={16} /> طراحی با هوش مصنوعی
            </Button>
          </Link>
          <Link to="/ai-design?mode=inspiration">
            <Button variant="outline" className="gap-2 border-primary/30">
              <Image size={16} /> جستجوی تصویری
            </Button>
          </Link>
          <Link to="/ai-design?mode=suggest">
            <Button variant="outline" className="gap-2">
              <Search size={16} /> پیشنهاد هوش مصنوعی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DesignCTA;
