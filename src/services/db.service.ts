import prisma from '../database/prisma';
import { User, Settings, Chat, Message } from '@prisma/client';

export class UserService {
  static async getOrCreateUser(id: number, info: any) {
    let user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: { settings: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: BigInt(id),
          username: info.username,
          firstName: info.first_name,
          lastName: info.last_name,
          languageCode: info.language_code,
          settings: {
            create: {
              preferredModel: 'gpt-4o',
              language: 'ar',
            },
          },
        },
        include: { settings: true },
      });
    }

    return user;
  }

  static async updateSettings(userId: number, data: Partial<Settings>) {
    return prisma.settings.update({
      where: { userId: BigInt(userId) },
      data,
    });
  }

  static async isBlocked(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(userId) } });
    return user?.blocked || false;
  }
}

export class ChatService {
  static async createChat(userId: number, title?: string) {
    return prisma.chat.create({
      data: {
        userId: BigInt(userId),
        title: title || 'New Chat',
      },
    });
  }

  static async getChats(userId: number) {
    return prisma.chat.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  static async getMessages(chatId: string) {
    return prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async saveMessage(
    chatId: string,
    role: string,
    content: string,
    type: string = 'text',
    metadata?: any
  ) {
    await prisma.message.create({
      data: {
        chatId,
        role,
        content,
        type,
        metadata,
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
  }

  static async clearChat(chatId: string) {
    return prisma.message.deleteMany({ where: { chatId } });
  }
}
