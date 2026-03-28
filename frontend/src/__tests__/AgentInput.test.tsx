import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useEffect } from 'react';
import { vi } from 'vitest';
import AgentInput from '../components/shared/AgentInput';
import { AgentContextProvider, useAgentContext } from '../context/AgentContext';

const mockSendMessage = vi.hoisted(() => vi.fn());

vi.mock('@foodchestra/sdk', () => ({
  client: {
    chat: {
      sendMessage: mockSendMessage,
    },
  },
}));

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
  vi.resetAllMocks();
});

describe('AgentInput', () => {
  it('renders a textarea and a send button', () => {
    renderAgentInput();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has the correct placeholder', () => {
    renderAgentInput();
    expect(screen.getByPlaceholderText('Ask about this product…')).toBeInTheDocument();
  });

  it('does not call sendMessage when input is empty', async () => {
    renderAgentInput();
    fireEvent.click(screen.getByRole('button'));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('does not call sendMessage when input is only whitespace', async () => {
    renderAgentInput();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button'));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('calls sendMessage with trimmed message and context', async () => {
    mockSendMessage.mockResolvedValueOnce({ response: 'ok', toolSteps: [] });
    renderAgentInput('Page: Scanner');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith('hello', 'Page: Scanner', undefined));
  });

  it('calls sendMessage on Enter key', async () => {
    mockSendMessage.mockResolvedValueOnce({ response: 'ok', toolSteps: [] });
    renderAgentInput();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'what is this?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith('what is this?', undefined, undefined));
  });

  it('does not send on Shift+Enter', () => {
    renderAgentInput();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'line one' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('clears the input after sending', async () => {
    mockSendMessage.mockResolvedValueOnce({ response: 'ok', toolSteps: [] });
    renderAgentInput();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('passes undefined context when none is set', async () => {
    mockSendMessage.mockResolvedValueOnce({ response: 'ok', toolSteps: [] });
    renderAgentInput();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith('hi', undefined, undefined));
  });

  it('passes history of prior turns on the second message', async () => {
    mockSendMessage
      .mockResolvedValueOnce({ response: 'First reply', toolSteps: [] })
      .mockResolvedValueOnce({ response: 'Second reply', toolSteps: [] });

    renderAgentInput();
    const textarea = screen.getByRole('textbox');

    // First message — no history
    fireEvent.change(textarea, { target: { value: 'first question' } });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(1));

    // Second message — history contains both sides of turn 1
    fireEvent.change(textarea, { target: { value: 'second question' } });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(2));

    expect(mockSendMessage).toHaveBeenNthCalledWith(
      2,
      'second question',
      undefined,
      ['USER: first question', 'THE AGENT: First reply'],
    );
  });

  it('logs sending and response to console', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockSendMessage.mockResolvedValueOnce({ response: 'done', toolSteps: ['get_alive'] });
    renderAgentInput('ctx');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ping' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(logSpy).toHaveBeenCalledWith('[AgentInput] Response:', 'done'));
    expect(logSpy).toHaveBeenCalledWith('[AgentInput] Sending:', expect.objectContaining({ message: 'ping' }));
    expect(logSpy).toHaveBeenCalledWith('[AgentInput] Tools used:', ['get_alive']);
  });

  it('logs error to console when sendMessage rejects', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSendMessage.mockRejectedValueOnce(new Error('network fail'));
    renderAgentInput();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oops' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => expect(errSpy).toHaveBeenCalledWith('[AgentInput] Error:', expect.any(Error)));
  });
});
