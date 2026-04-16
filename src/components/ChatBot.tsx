import { useState } from "react";
import { MessageCircle, X, Send, Mic } from "lucide-react";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);

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
        <div className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-luxury overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="gradient-gold p-4">
            <h3 className="text-primary-foreground font-bold">دستیار هوشمند خانه‌زیبا</h3>
            <p className="text-primary-foreground/70 text-sm">سلام! چطور می‌تونم کمکتون کنم؟</p>
          </div>

          {/* Messages */}
          <div className="h-72 p-4 overflow-y-auto">
            <div className="bg-accent rounded-2xl rounded-tr-none p-3 text-sm text-foreground max-w-[80%] mb-4">
              سلام! 👋 من دستیار هوشمند خانه‌زیبا هستم. می‌تونم در انتخاب محصولات، سبک دکوراسیون و مشاوره خرید کمکتون کنم.
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex items-center gap-2">
            <button className="text-muted-foreground hover:text-gold transition-colors p-2">
              <Mic size={20} />
            </button>
            <input
              type="text"
              placeholder="پیام خود را بنویسید..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
            />
            <button className="gradient-gold text-primary-foreground p-2 rounded-xl hover:opacity-90 transition-opacity">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
