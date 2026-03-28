import type { ChatRequest, ChatResponse } from '../types/chat.js';

type PostFn = <T>(path: string, body: unknown) => Promise<T>;

export function chatRoutes(post: PostFn) {
  return {
    sendMessage: (message: string, context?: string, history?: string[]) =>
      post<ChatResponse>('/chat', { message, context, history } satisfies ChatRequest),
  };
}
