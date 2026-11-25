export interface ParsedIntentResponse {
  action: string;
  password: string | null;
  message?: string | null;
}

export function parseIntent(transcript: string): Promise<ParsedIntentResponse>;
