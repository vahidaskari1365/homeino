import { useState } from "react";
import { MessageCircle, X, Send, Mic } from "lucide-react";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", content: "سلام! 👋 من دستیار هوشمند خانه‌زیبا هستم. چطور می‌تونم کمکتون کنم؟" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Simple automated responses
    setTimeout(() => {
      let response = "ببخشید، من هنوز در حال یادگیری هستم. برای مشاوره دقیق‌تر می‌توانید با پشتیبانی تماس بگیرید.";
      const lowInput = input.toLowerCase();
      
      if (lowInput.includes("سلام") || lowInput.includes("درود")) {
        response = "سلام! خوشحالم که می‌بینمتون. چه کمکی از دستم برمی‌آید؟";
      } else if (lowInput.includes("خرید") || lowInput.includes("سفارش")) {
        response = "برای خرید محصولات می‌توانید به بخش «فروشگاه‌ها» مراجعه کنید و کالای مورد نظر خود را به سبد خرید اضافه کنید.";
      } else if (lowInput.includes("قیمت")) {
        response = "قیمت اکثر محصولات در صفحه هر فروشگاه درج شده است. برای موارد خاص می‌توانید «درخواست قیمت» ارسال کنید.";
      } else if (lowInput.includes("طراح") || lowInput.includes("دکوراسیون")) {
        response = "ما بهترین طراحان داخلی را در بخش «طراحان» معرفی کرده‌ایم. همچنین می‌توانید از سرویس «طراحی با AI» استفاده کنید.";
      }
      
      setMessages(prev => [...prev, { role: "bot", content: response }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 w-16 h-16 gradient-gold rounded-full shadow-luxury flex items-center justify-center hover:scale-105 transition-transform duration-300"
      >
        {isOpen ? <X size={24} className="text-primary-foreground" /> : <MessageCircle size={24} className="text-primary-foreground" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-luxury overflow-hidden animate-fade-in-up flex flex-col">
          {/* Header */}
          <div className="gradient-gold p-4 shrink-0">
            <h3 className="text-primary-foreground font-bold">دستیار هوشمند خانه‌زیبا</h3>
            <p className="text-primary-foreground/70 text-sm">آماده پاسخگویی به سوالات شما</p>
          </div>

          {/* Messages */}
          <div className="flex-1 h-72 p-4 overflow-y-auto space-y-4 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 text-sm rounded-2xl ${
                  m.role === 'user' 
                    ? 'bg-gold text-primary-foreground rounded-br-none' 
                    : 'bg-card border border-border text-foreground rounded-tr-none shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex items-center gap-2 bg-card">
            <button className="text-muted-foreground hover:text-gold transition-colors p-2 shrink-0">
              <Mic size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
            />
            <button 
              onClick={handleSend}
              className="gradient-gold text-primary-foreground p-2 rounded-xl hover:opacity-90 transition-opacity shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
