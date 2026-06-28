export const MESSAGE_ROLES = {
  system: 'system',
  user: 'user',
  assistant: 'assistant',
  tool: 'tool',
} as const;

export type MessageRole = (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];
