import { useRef, useState } from 'react';
import './AgentInput.scss';

const MAX_ROWS = 4;

function AgentInput() {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    console.log(value);
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
