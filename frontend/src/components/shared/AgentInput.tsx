import { useRef, useState } from 'react';
import { client } from '@foodchestra/sdk';
import { useAgentContext } from '../../context/AgentContext';
import './AgentInput.scss';

const MAX_ROWS = 4;

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

function AgentInput() {
  const [value, setValue] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { context } = useAgentContext();

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const history = conversation.map((m) =>
      m.role === 'user' ? `USER: ${m.content}` : `THE AGENT: ${m.content}`,
    );

    console.log('[AgentInput] Sending:', { message: trimmed, context, history });

    setConversation((prev) => [...prev, { role: 'user', content: trimmed }]);
    setValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }

    try {
      const result = await client.chat.sendMessage(
        trimmed,
        context || undefined,
        history.length ? history : undefined,
      );
      if (result.toolSteps.length > 0) {
        console.log('[AgentInput] Tools used:', result.toolSteps);
      }
      console.log('[AgentInput] Response:', result.response);
      setConversation((prev) => [...prev, { role: 'assistant', content: result.response }]);
    } catch (err) {
      console.error('[AgentInput] Error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);

    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * MAX_ROWS + parseFloat(getComputedStyle(el).paddingTop) * 2;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  return (
    <div className="agent-input">
      <textarea
        ref={textareaRef}
        className="agent-input__field form-control"
        placeholder="Ask about this product…"
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button
        className="agent-input__send btn btn-primary"
        type="button"
        onClick={handleSend}
      >
        <span className="material-icons">send</span>
      </button>
    </div>
  );
}

export default AgentInput;
