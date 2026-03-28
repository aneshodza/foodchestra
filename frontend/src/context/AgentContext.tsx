import { createContext, useContext, useEffect, useState } from 'react';

interface AgentContextValue {
  context: string;
  setContext: (ctx: string) => void;
}

const AgentContext = createContext<AgentContextValue>({
  context: '',
  setContext: () => undefined,
});

export function AgentContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState('');
  return (
    <AgentContext.Provider value={{ context, setContext }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  return useContext(AgentContext);
}

export function useSetAgentContext(ctx: string) {
  const { setContext } = useAgentContext();
  useEffect(() => {
    setContext(ctx);
  }, [ctx]); // eslint-disable-line react-hooks/exhaustive-deps
}
