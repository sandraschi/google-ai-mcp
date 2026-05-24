export interface Persona {
  id: string;
  name: string;
  description: string;
  greeting: string;
  systemPrompt: string;
  avatar: string;
  tags: string[];
}

export interface PersonaOption extends Omit<Persona, "systemPrompt"> {
  value: string;
  label: string;
}

export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isError?: boolean;
  isRegenerating?: boolean;
  feedback?: "like" | "dislike" | null;
  personaId?: string;
}
