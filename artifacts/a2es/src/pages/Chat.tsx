import { useState, useEffect, useRef } from "react";
import { useListChatSessions, useCreateChatSession, useGetChatMessages } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Send, MessageSquare, Bot, User, Cpu } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "Essa máquina vale a pena modernizar?",
  "Qual inversor de frequência seria ideal?",
  "Qual o risco de manter esse equipamento antigo?",
  "Quanto eu economizaria por ano com retrofit?",
  "Quais sensores devo instalar primeiro?",
  "Como calcular o payback de um projeto de eficiência?",
  "O que é o PROCEL e como se qualificar?",
  "Como solicitar financiamento BNDES para modernização?",
];

interface MessageContent {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

type DisplayMessage = MessageContent | (StreamMessage & { id?: number });

export default function Chat() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions, refetch: refetchSessions } = useListChatSessions();
  const createSession = useCreateChatSession();
  const { data: dbMessages } = useGetChatMessages(selectedSessionId!, {
    query: { enabled: !!selectedSessionId }
  });

  useEffect(() => {
    setStreamMessages([]);
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages, streamMessages]);

  const handleCreateSession = async () => {
    const title = newSessionTitle.trim() || "Nova Consulta";
    const session = await createSession.mutateAsync({ title });
    setSelectedSessionId(session.id);
    setNewSessionTitle("");
    setShowNewSession(false);
    await refetchSessions();
  };

  const handleSend = async (content: string) => {
    if (!content.trim() || !selectedSessionId || isStreaming) return;
    setInput("");
    setIsStreaming(true);

    const userMsg: StreamMessage = { role: "user", content, createdAt: new Date().toISOString() };
    const assistantMsg: StreamMessage = { role: "assistant", content: "", createdAt: new Date().toISOString(), isStreaming: true };
    setStreamMessages(prev => [...prev, userMsg, assistantMsg]);

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/chat/sessions/${selectedSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setStreamMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: fullContent };
                }
                return updated;
              });
            }
            if (data.done) {
              setStreamMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, isStreaming: false };
                }
                return updated;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setStreamMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: "Erro ao processar resposta.", isStreaming: false };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const allMessages: DisplayMessage[] = selectedSessionId
    ? [...(dbMessages || []).filter(m => {
        return !streamMessages.some(sm => sm.content === m.content && sm.role === m.role);
      }), ...streamMessages]
    : streamMessages;

  return (
    <div className="flex h-[calc(100vh-4.5rem)] gap-4 px-4 md:px-6 max-w-7xl mx-auto w-full">
      {/* Session list */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#333333]">Conversas</h2>
          <button
            onClick={() => setShowNewSession(true)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#00B140] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showNewSession && (
          <div className="flex gap-1">
            <Input
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              placeholder="Título da conversa"
              className="text-xs h-8 flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreateSession} disabled={createSession.isPending} className="h-8 px-2 bg-[#00B140] hover:bg-[#007A33] text-white">
              {createSession.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1">
          {!sessions?.length && (
            <p className="text-xs text-gray-400 text-center mt-4 px-2">Nenhuma conversa. Crie uma nova para começar.</p>
          )}
          {sessions?.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSessionId(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors ${
                selectedSessionId === s.id
                  ? "bg-[#00B140] text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {!selectedSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-[#00B140]" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-[#333333] mb-1">Especialista em Eficiência Industrial</h3>
              <p className="text-sm text-gray-500 max-w-sm">Converse com nossa IA especialista sobre eficiência energética, retrofit, ESG e financiamento industrial.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTED_QUESTIONS.slice(0, 6).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    createSession.mutateAsync({ title: q.substring(0, 40) }).then((s) => {
                      setSelectedSessionId(s.id);
                      refetchSessions();
                      setTimeout(() => handleSend(q), 300);
                    });
                  }}
                  className="text-left px-3 py-2.5 text-xs text-gray-600 bg-gray-50 hover:bg-green-50 hover:text-[#007A33] rounded-lg border border-gray-200 hover:border-green-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {allMessages.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
                  <Bot className="w-8 h-8" />
                  <p className="text-sm">Faça sua primeira pergunta ao especialista</p>
                  <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
                    {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="text-left px-3 py-2 text-xs text-gray-600 bg-gray-50 hover:bg-green-50 hover:text-[#007A33] rounded border border-gray-200 hover:border-green-200 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {allMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-[#00B140]" : "bg-gray-100"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-[#00B140] text-white" : "bg-gray-50 border border-gray-200 text-[#333333]"
                  }`}>
                    {msg.content || (('isStreaming' in msg && msg.isStreaming) ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "")}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                  placeholder="Faça uma pergunta ao especialista..."
                  className="flex-1 text-sm"
                  disabled={isStreaming}
                />
                <Button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isStreaming}
                  className="bg-[#00B140] hover:bg-[#007A33] text-white px-4"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
