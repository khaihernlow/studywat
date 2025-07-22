import { useEffect, useState, useRef, memo } from 'react';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatContext } from '@/contexts/ChatContext';
import type { Message } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mt-5 mb-3">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc list-outside mb-3 space-y-1 pl-8 custom-bullet">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside mb-3 space-y-1 pl-8">{children}</ol>,
  li: ({ children }) => <li className="mb-2 first:mt-2">{children}</li>,
  code: ({ children }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic mb-3">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-6 border-t border-muted" />,
  table: ({ children }) => (
    <div
      className="overflow-x-auto my-4"
    >
      <table className="min-w-[300px] w-max border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b-2 border-neutral-400">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-neutral-200 last:border-b-0" {...props}>{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left font-semibold bg-neutral-100 break-words max-w-md">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 break-words max-w-md">{children}</td>
  ),
};

// Improved function to split markdown into table and text blocks
function splitMarkdownBlocks(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: { type: 'table' | 'text'; content: string }[] = [];
  let buffer: string[] = [];
  let inTable = false;

  function flushBuffer(type: 'table' | 'text') {
    if (buffer.length > 0) {
      blocks.push({ type, content: buffer.join('\n') });
      buffer = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Table header: starts with | and next line is a separator
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*(:?-+:?\s*\|)+\s*$/.test(lines[i + 1])
    ) {
      // Flush any text buffer
      flushBuffer('text');
      inTable = true;
      buffer.push(line);
      continue;
    }
    // Table row or separator
    if (inTable && /^\s*\|.*\|\s*$/.test(line)) {
      buffer.push(line);
      continue;
    }
    // End of table
    if (inTable) {
      flushBuffer('table');
      inTable = false;
    }
    buffer.push(line);
  }
  // Flush any remaining buffer
  if (buffer.length > 0) {
    flushBuffer(inTable ? 'table' : 'text');
  }
  return blocks.filter(b => b.content.trim() !== '');
}

const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
  if (message.isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-secondary text-secondary-foreground px-4 py-3 rounded-xl max-w-xs lg:max-w-md">
          <p className="text-base">{message.text}</p>
        </div>
      </div>
    );
  }

  const blocks = splitMarkdownBlocks(message.text);

  // Only render if there is an alert or text
  if ((!message.alert || message.alert.length === 0) && !message.text) {
    return null;
  }

  return (
    <div className="flex justify-start py-5">
      <div className="w-full">
        {message.alert && message.alert.length > 0 && (
          <div className="mb-2 flex flex-row gap-2 flex-wrap">
            {message.alert.map((alert, idx) => (
              <div
                key={idx}
                className="px-4 py-2 rounded-lg bg-purple-100 text-purple-800 font-semibold text-sm"
                style={{ display: 'inline-block', minWidth: 'fit-content' }}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}
        {message.text && blocks.map((block, i) =>
          block.type === 'table' ? (
            <div
              key={i}
              className="overflow-x-auto my-4"
              style={{
                width: 'calc(100vw - 16rem)',
                marginLeft: '16rem',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ...markdownComponents,
                  table: ({ children }) => (
                    <table className="min-w-[300px] w-max border-collapse">{children}</table>
                  ),
                }}
              >
                {block.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div key={i} className="prose prose-sm max-w-3xl text-foreground text-neutral-800">
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {block.content}
              </ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  );
});

export default function Chat() {
  const { setTitle } = usePageTitle();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, setMessages, isLoadingHistory, setIsLoadingHistory } = useChatContext();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [_pendingText, _setPendingText] = useState('');
  const [_typingBotId, _setTypingBotId] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const autoSendMessageRef = useRef<string | null>(null);
  const [autoSendReady, setAutoSendReady] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const isMobile = useIsMobile();
  const firstLoadRef = useRef(true);
  const { getValidAccessToken } = useAuth();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Rotating loading messages with typing effect and emoji
  const loadingMessages = [
    "🧠 Thinking hard…",
    "🔮 Consulting the study gods…",
    "💡 Fetching the best advice…",
    "✏️ Sharpening my pencils…",
    "📚 Reading textbooks at lightning speed…",
    "🤖 Googling (just kidding)…",
    "🧐 Making sense of your question…",
    "📒 Checking my notes…",
    "🧑‍🏫 Summoning the wisdom of professors…",
    "⏳ Almost there…"
  ];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [typedMsg, setTypedMsg] = useState('');
  const [showDots, setShowDots] = useState(false);
  const typingInterval = 40; // ms per character
  const dotsDuration = 2200; // ms to show dots after message is fully typed (longer bounce)
  useEffect(() => {
    if (!isLoading) return;
    setTypedMsg('');
    setShowDots(false);
    let charIdx = 0;
    const msg = loadingMessages[loadingMsgIdx];
    // Typing effect
    const typeTimer = setInterval(() => {
      charIdx++;
      setTypedMsg(msg.slice(0, charIdx));
      if (charIdx >= msg.length) {
        clearInterval(typeTimer);
        setShowDots(true);
        // After dotsDuration, move to next message
        setTimeout(() => {
          setShowDots(false);
          setLoadingMsgIdx(Math.floor(Math.random() * loadingMessages.length));
        }, dotsDuration);
      }
    }, typingInterval);
    return () => {
      clearInterval(typeTimer);
    };
  }, [isLoading, loadingMsgIdx]);
  // Reset message index when loading starts, but randomize the first message
  useEffect(() => {
    if (isLoading) {
      setLoadingMsgIdx(Math.floor(Math.random() * loadingMessages.length));
    }
  }, [isLoading]);

  useEffect(() => {
    setTitle('Chat Advisor');
    loadChatHistory();
  }, [setTitle]);

  // Step 1: After chat loads, fill input and set up auto-send message
  useEffect(() => {
    if (
      !isLoadingHistory &&
      location.state &&
      location.state.trait &&
      location.state.label
    ) {
      setIsAutomating(true);
      const { trait, label } = location.state;
      const message = `Can you help me understand why you said my trait is ${label} for ${trait} from my profile? I'd love to know how you came up with that and what it says about me. Let's talk about that!`;
      autoSendMessageRef.current = message;
      setAutoSendReady(false);
      // Wait 1 second after chat loads, then fill input
      const fillTimer = setTimeout(() => {
        setInputValue(message);
        setAutoSendReady(true);
      }, 1000);
      return () => clearTimeout(fillTimer);
    }
  }, [isLoadingHistory, location.state]);

  // Step 2: When inputValue matches auto-send message and ready, send after delay
  useEffect(() => {
    if (autoSendReady && inputValue && autoSendMessageRef.current && inputValue === autoSendMessageRef.current) {
      const sendTimer = setTimeout(() => {
        handleSendMessage();
        // Clear the state so it doesn't repeat if user navigates back
        navigate(location.pathname, { replace: true, state: {} });
        autoSendMessageRef.current = null;
        setAutoSendReady(false);
        setIsAutomating(false);
      }, 1500);
      return () => clearTimeout(sendTimer);
    }
  }, [autoSendReady, inputValue, navigate, location.pathname]);

  // If automation is cancelled (e.g., user navigates away), reset automation state
  useEffect(() => {
    return () => {
      setIsAutomating(false);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use smooth scroll only on first load after reload
      const behavior = firstLoadRef.current && !isLoadingHistory ? 'smooth' : 'auto';
      messagesEndRef.current.scrollIntoView({ behavior });
      if (!isLoadingHistory) {
        firstLoadRef.current = false;
      }
    }
  }, [messages, isLoadingHistory]);

  const loadChatHistory = async () => {
    if (messages.length > 0) {
      setIsLoadingHistory(false);
      return;
    }
    try {
      setIsLoadingHistory(true);
      const token = await getValidAccessToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(`${API_BASE_URL}/api/v1/orchestrator/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const historyMessages: Message[] = data.conversations.map((msg: any, index: number) => {
          return {
            id: index,
            text: msg.content,
            isUser: msg.role === 'user',
            timestamp: new Date(msg.timestamp),
            alert: Array.isArray(msg.alert) ? msg.alert : [],
          };
        });
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
      alert: [],
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error('Not authenticated');
      const conversation_history = [...messages, userMessage].map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text,
        timestamp: m.timestamp
      }));

      const response = await fetch(`${API_BASE_URL}/api/v1/orchestrator/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inputValue,
          conversation_history
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            text: data.assistant_text,
            isUser: false,
            timestamp: new Date(),
            alert: data.alert || []
          }
        ]);
        setIsLoading(false);
      } else {
        setMessages(prev => [
          ...prev,
          { id: Date.now() + 2, text: 'Sorry, something went wrong.', isUser: false, timestamp: new Date(), alert: [] }
        ]);
        setIsLoading(false);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          text: "Sorry, I'm having trouble connecting. Please check your internet connection.",
          isUser: false,
          timestamp: new Date(),
          alert: [],
        }
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading indicator if isLoading and the latest assistant message has no text
  //const lastAssistantMsg = [...messages].reverse().find(m => !m.isUser);
  //const showLoadingIndicator = isLoading && (!lastAssistantMsg || lastAssistantMsg.text.length === 0);
  const showLoadingIndicator = isLoading;

  // Show loading spinner while fetching history
  if (isLoadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
        <div className="text-center w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your conversation history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-2 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-lg">Hello! I'm your study advisor. How can I help you today?</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {showLoadingIndicator && (
            <div className="flex flex-col items-start max-w-xs lg:max-w-md py-5">
              <div className="mb-2 text-sm text-muted-foreground min-h-[1.5em] flex items-center">
                <span style={{paddingRight: '0.5em'}}>{typedMsg}</span>
                {showDots && (
                  <span className="flex items-center ml-2">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0s', opacity: 0.6 }}></span>
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s', opacity: 0.4, marginLeft: '0.2em' }}></span>
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s', opacity: 0.2, marginLeft: '0.2em' }}></span>
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {/* Input Area */}
      <div className="sticky bottom-0 w-full z-20 bg-background border-t px-4">
        <div className="flex gap-2 w-full py-4 max-w-3xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || isAutomating}
            className={`flex-1 px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background ${isMobile ? 'rounded-full' : 'rounded-2xl'}`}
          />
          <button
            className={`bg-primary text-white px-4 py-2 disabled:opacity-50 flex items-center gap-2 ${isMobile ? 'rounded-full' : 'rounded-2xl'}`}
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim() || isAutomating}
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
            {!isMobile && <span>Send</span>}
          </button>
        </div>
      </div>
    </div>
  );
} 