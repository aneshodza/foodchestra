import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import { vi } from 'vitest';
import AgentInput from '../components/shared/AgentInput';
import { AgentContextProvider, useAgentContext } from '../context/AgentContext';

function ContextPreloader({ ctx }: { ctx: string }) {
  const { setContext } = useAgentContext();
  useEffect(() => { setContext(ctx); }, [ctx, setContext]);
  return null;
}

function renderAgentInput(context = '') {
  return render(
    <AgentContextProvider>
      {context && <ContextPreloader ctx={context} />}
      <AgentInput />
    </AgentContextProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AgentInput', () => {
  it('renders a textarea and a send button', () => {
    renderAgentInput();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('textarea has the correct placeholder', () => {
    renderAgentInput();
    expect(screen.getByPlaceholderText('Ask about this product…')).toBeInTheDocument();
  });

  it('logs message and context when send button is clicked', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    renderAgentInput('Page: Scanner');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button'));

    expect(spy).toHaveBeenCalledWith({ message: 'hello', context: 'Page: Scanner' });
  });

  it('logs message and context when Enter is pressed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    renderAgentInput('Page: Product');

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'what is this?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(spy).toHaveBeenCalledWith({ message: 'what is this?', context: 'Page: Product' });
  });

  it('does NOT send when Shift+Enter is pressed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    renderAgentInput();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'line one' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(spy).not.toHaveBeenCalled();
  });

  it('includes empty context when no provider context is set', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    renderAgentInput();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button'));

    expect(spy).toHaveBeenCalledWith({ message: 'hi', context: '' });
  });

  it('logs the latest context after it changes', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { rerender } = render(
      <AgentContextProvider>
        <ContextPreloader ctx="first" />
        <AgentInput />
      </AgentContextProvider>,
    );

    rerender(
      <AgentContextProvider>
        <ContextPreloader ctx="second" />
        <AgentInput />
      </AgentContextProvider>,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'msg' } });
    fireEvent.click(screen.getByRole('button'));

    expect(spy).toHaveBeenCalledWith({ message: 'msg', context: 'second' });
  });
});
