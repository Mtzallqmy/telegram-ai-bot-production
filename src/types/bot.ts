import { Context, Scenes } from 'telegraf';
import { User, Settings, Chat } from '@prisma/client';

export interface MyContext extends Context {
  dbUser: User & { settings: Settings | null };
  currentChat?: Chat;
  scene: Scenes.SceneContextScene<MyContext>;
}
