import { Settings } from '@prisma/client';
export declare class UserService {
    static getOrCreateUser(id: number, info: any): Promise<{
        settings: {
            id: string;
            preferredModel: string;
            language: string;
            translationMode: string;
            notifications: boolean;
            userId: bigint;
        } | null;
    } & {
        id: bigint;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        languageCode: string | null;
        isBot: boolean;
        blocked: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static updateSettings(userId: number, data: Partial<Settings>): Promise<{
        id: string;
        preferredModel: string;
        language: string;
        translationMode: string;
        notifications: boolean;
        userId: bigint;
    }>;
    static isBlocked(userId: number): Promise<boolean>;
}
export declare class ChatService {
    static createChat(userId: number, title?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: bigint;
        title: string | null;
        pinned: boolean;
    }>;
    static getChats(userId: number): Promise<({
        _count: {
            messages: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: bigint;
        title: string | null;
        pinned: boolean;
    })[]>;
    static getMessages(chatId: string): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        chatId: string;
        role: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    static saveMessage(chatId: string, role: string, content: string, type?: string, metadata?: any): Promise<void>;
    static clearChat(chatId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
