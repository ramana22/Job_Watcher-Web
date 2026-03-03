import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL, getStoredToken } from "../../services/api.js";
import "./ChatWidget.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const formatAssistantMarkdown = (input: string): string => {
  let text = input;

  // Ensure headings start on their own line
  text = text.replace(/([^\n])##\s/g, "$1\n\n## ");

  // Ensure bullets start on their own line
  text = text.replace(/([^\n])-\s/g, "$1\n- ");

  // Ensure table separators are on their own line
  text = text.replace(/([^\n])\|---/g, "$1\n|---");

  // Add a space around double pipes often used as table separators
  text = text.replace(/\|\|/g, " || ");

  return text;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([] as Message[]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null as HTMLDivElement | null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const systemPrompt = useMemo(
    () =>
      [
        "You are JobWatch AI Assistant, helping users with job searching and career tasks.",
        "Write in a professional, friendly tone.",
        "Use Markdown for formatting (bold, lists, code), and ensure it renders cleanly.",
        "Do not use emojis.",
        "Do not use the sequence ':-'. If you need a colon, use ':' followed by a space or a newline.",
      ].join("\n"),
    [],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (isStreaming || !input.trim()) return;

    const newMessages = [
      ...(messages as Message[]),
      { role: "user" as const, content: input },
    ] as Message[];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setIsStreaming(true);

    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, ...newMessages],
        }),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(details || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body received.");
      }

      const decoder = new TextDecoder("utf-8");
      let assistantRaw = "";
      let buffer = "";
      let currentEvent = "message";
      let dataParts: string[] = [];

      const flushEvent = () => {
        if (dataParts.length === 0) {
          currentEvent = "message";
          return;
        }
        const data = dataParts.join("\n");
        dataParts = [];

        if (currentEvent === "error") {
          try {
            const parsed = JSON.parse(data);
            setError(typeof parsed?.error === "string" ? parsed.error : data);
          } catch {
            setError(data);
          } finally {
            currentEvent = "message";
          }
          return;
        }

        assistantRaw += data;
        const assistantMessage = formatAssistantMarkdown(assistantRaw);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: assistantMessage };
          } else {
            updated.push({ role: "assistant", content: assistantMessage });
          }
          return updated;
        });
        currentEvent = "message";
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const rawLine = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const line = rawLine.replace(/\r$/, "");

          if (line.startsWith("event:")) {
            currentEvent = line.slice("event:".length).trim() || "message";
          } else if (line.startsWith("data:")) {
            // SSE spec allows an optional single space after "data:".
            // We must NOT trim leading spaces in the payload itself,
            // otherwise streamed tokens like " there" lose their space
            // and words get glued together (e.g., "Hithere").
            if (line.startsWith("data: ")) {
              dataParts.push(line.slice("data: ".length));
            } else {
              dataParts.push(line.slice("data:".length));
            }
          } else if (line.trim() === "") {
            flushEvent();
          }

          newlineIndex = buffer.indexOf("\n");
        }
      }
      flushEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button type="button" className="jw-chat-fab" onClick={toggleChat} aria-label="Open chat">
        <span className="jw-chat-fabIcon" aria-hidden="true">
          {/* simple bubble icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M7.5 18.5l-3 2V6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H8.5a1 1 0 0 0-.6.2l-.4.3z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M8 8.5h8M8 11.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <section className="jw-chat-panel" aria-label="JobWatch AI Assistant">
          <header className="jw-chat-header">
            <div className="jw-chat-headerText">
              <div className="jw-chat-titleRow">
                <div className="jw-chat-title">JobWatch AI Assistant</div>
                <div className="jw-chat-status" aria-label={isStreaming ? "Thinking" : "Online"}>
                  <span className={isStreaming ? "jw-chat-dot jw-chat-dot--busy" : "jw-chat-dot"} aria-hidden="true" />
                  <span className="jw-chat-statusText">{isStreaming ? "Thinking…" : "Online"}</span>
                </div>
              </div>
              <div className="jw-chat-subtitle">Ask about roles, resume bullets, or interview prep.</div>
            </div>
            <button type="button" className="jw-chat-close" onClick={toggleChat} aria-label="Close chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="jw-chat-messages" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="jw-chat-empty">
                <div className="jw-chat-emptyTitle">How can I help?</div>
                <div className="jw-chat-emptyHint">Try: “Rewrite my resume summary for a frontend role.”</div>
              </div>
            ) : null}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={msg.role === "user" ? "jw-chat-msg jw-chat-msg--user" : "jw-chat-msg jw-chat-msg--assistant"}
              >
                <div className="jw-chat-bubble">
                  <div className="jw-chat-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {error ? (
              <div className="jw-chat-msg jw-chat-msg--assistant">
                <div className="jw-chat-bubble jw-chat-bubble--error">
                  <div className="jw-chat-errorTitle">Something went wrong</div>
                  <div className="jw-chat-errorBody">{error}</div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <footer className="jw-chat-inputBar">
            <textarea
              className="jw-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="button"
              className="jw-chat-send"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
            >
              Send
            </button>
          </footer>
        </section>
      )}
    </>
  );
};

export default ChatWidget;