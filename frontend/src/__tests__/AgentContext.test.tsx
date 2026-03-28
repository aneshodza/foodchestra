import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { vi } from 'vitest';
import { AgentContextProvider, useAgentContext, useSetAgentContext } from '../context/AgentContext';

function ContextDisplay() {
  const { context } = useAgentContext();
  return <div data-testid="context">{context}</div>;
}

function ContextSetter({ ctx }: { ctx: string }) {
  useSetAgentContext(ctx);
  return null;
}

function ContextSetterDirect({ ctx }: { ctx: string }) {
  const { setContext } = useAgentContext();
  useEffect(() => { setContext(ctx); }, [ctx, setContext]);
  return null;
}

describe('AgentContextProvider', () => {
  it('renders its children', () => {
    render(
      <AgentContextProvider>
        <span>hello</span>
      </AgentContextProvider>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('provides an empty string as the default context', () => {
    render(
      <AgentContextProvider>
        <ContextDisplay />
      </AgentContextProvider>,
    );
    expect(screen.getByTestId('context').textContent).toBe('');
  });
});

describe('useAgentContext', () => {
  it('returns the current context value set by setContext', () => {
    render(
      <AgentContextProvider>
        <ContextSetterDirect ctx="test context" />
        <ContextDisplay />
      </AgentContextProvider>,
    );
    expect(screen.getByTestId('context').textContent).toBe('test context');
  });
});

describe('useSetAgentContext', () => {
  it('sets the context string on mount', () => {
    render(
      <AgentContextProvider>
        <ContextSetter ctx="Page: Scanner" />
        <ContextDisplay />
      </AgentContextProvider>,
    );
    expect(screen.getByTestId('context').textContent).toBe('Page: Scanner');
  });

  it('updates the context when the string changes', () => {
    const { rerender } = render(
      <AgentContextProvider>
        <ContextSetter ctx="first" />
        <ContextDisplay />
      </AgentContextProvider>,
    );
    expect(screen.getByTestId('context').textContent).toBe('first');

    act(() => {
      rerender(
        <AgentContextProvider>
          <ContextSetter ctx="second" />
          <ContextDisplay />
        </AgentContextProvider>,
      );
    });

    expect(screen.getByTestId('context').textContent).toBe('second');
  });

  it('does not crash when used outside a provider (uses default no-op)', () => {
    expect(() =>
      render(
        <ContextSetter ctx="outside" />,
      ),
    ).not.toThrow();
  });
});

describe('useAgentContext outside provider', () => {
  it('returns empty string as default context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ContextDisplay />);
    expect(screen.getByTestId('context').textContent).toBe('');
    spy.mockRestore();
  });
});
