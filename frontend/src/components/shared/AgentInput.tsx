import { useState, useRef, useEffect } from 'react';
import GlassBlock from './GlassBlock';
import './AgentInput.scss';

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3001';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function AgentInput() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for auto-messages dispatched by other components (e.g. after report filing)
  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent<{ message: string }>).detail;
      if (message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
        setIsOpen(true);
      }
    };
    window.addEventListener('foodchestra:agent-message', handler);
    return () => window.removeEventListener('foodchestra:agent-message', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setIsOpen(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error('Agent request failed');

      const data = await (res.json() as Promise<{ response: string }>);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not reach the agent. Is the backend running?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="agent-input">
      {isOpen && (
        <div className="agent-input__modal">
          <GlassBlock className="agent-input__history">
            <div className="agent-input__history-header">
              <span className="agent-input__history-title">AI Food Assistant</span>
              <button
                type="button"
                className="agent-input__close"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="agent-input__messages">
              {messages.length === 0 && (
                <p className="agent-input__empty">
                  Ask me about ingredients, recalls, supply chain, or food safety!
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`agent-input__message agent-input__message--${msg.role}`}>
                  <span className="agent-input__message-content">{msg.content}</span>
                </div>
              ))}
              {loading && (
                <div className="agent-input__thinking">
                  <span className="agent-input__dot" />
                  <span className="agent-input__dot" />
                  <span className="agent-input__dot" />
                  <span className="agent-input__thinking-label">Agent is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </GlassBlock>
        </div>
      )}

      <GlassBlock className="agent-input__bar">
        <span className="material-icons agent-input__bar-icon">smart_toy</span>
        <input
          ref={inputRef}
          type="text"
          className="agent-input__field"
          placeholder="Ask the food assistant anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => messages.length > 0 && setIsOpen(true)}
          aria-label="Ask the food assistant"
        />
        <button
          type="button"
          className="agent-input__send"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <span className="material-icons">
            {loading ? 'hourglass_empty' : 'send'}
          </span>
        </button>
      </GlassBlock>
    </div>
  );
}

export default AgentInput;
