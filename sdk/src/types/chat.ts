export interface ChatRequest {
  message: string;
  context?: string;
  history?: string[];
}

export interface ChatResponse {
  response: string;
  toolSteps: string[];
}
