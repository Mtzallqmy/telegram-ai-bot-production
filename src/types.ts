import { Context } from "telegraf";

export interface BotSession {
  step?: string;
  answers?: Record<string, string>;
  lastInteraction?: number;
}

export interface BotContext extends Context {
  session: BotSession;
  isAdmin: boolean;
}
