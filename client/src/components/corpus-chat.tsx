import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRender } from "@/components/markdown-render";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, MessageSquare, Bot, User, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CorpusChatProps {
  corpusId: string;
  theme?: {
    gradient: string;
    accent: string;
    text: string;
  };
}

const defaultTheme = {
  gradient: "from-purple-500 to-violet-600",
  accent: "text-purple-500",
  text: "text-purple-600 dark:text-purple-400",
};

export function CorpusChat({ corpusId, theme = defaultTheme }: CorpusChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/ai/chat", {
        corpusId,
        message,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.result }]);
    },
    onError: (error: any) => {
      toast({
        title: "Chat failed",
        description: error.message || "Could not get a response",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    chatMutation.mutate(trimmed);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full" data-testid="corpus-chat-container">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <h3 className={`text-sm font-semibold ${theme.text}`} data-testid="text-chat-title">Corpus Chat</h3>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            data-testid="button-clear-chat"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto space-y-4 p-4 rounded-lg border bg-muted/20"
        data-testid="chat-messages-container"
      >
        {messages.length === 0 && !chatMutation.isPending && (
          <motion.div
            className="flex flex-col items-center justify-center h-full py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Bot className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-chat-empty">Ask anything about your corpus</p>
            <p className="text-xs text-muted-foreground/60 mt-1">e.g. "What are the main themes?" or "Find examples of metaphors"</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`chat-message-${msg.role}-${idx}`}
            >
              {msg.role === "assistant" && (
                <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-3 max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownRender content={msg.content} showDownload={false} />
                ) : (
                  <p className="text-sm leading-relaxed" data-testid={`text-user-message-${idx}`}>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {chatMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
            data-testid="chat-loading-indicator"
          >
            <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 mt-0.5`}>
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analyzing corpus...</span>
              </div>
              <div className="mt-2 space-y-1.5">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about your corpus..."
          disabled={chatMutation.isPending}
          className="flex-1"
          data-testid="input-chat-message"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          className={`bg-gradient-to-r ${theme.gradient} text-white shrink-0`}
          data-testid="button-send-chat"
        >
          {chatMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
