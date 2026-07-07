import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const InspirationSearch = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/ai-design?mode=inspiration", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-accent" size={32} />
    </div>
  );
};

export default InspirationSearch;
