"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = exports.UserService = void 0;
const prisma_1 = __importDefault(require("../database/prisma"));
class UserService {
    static async getOrCreateUser(id, info) {
        let user = await prisma_1.default.user.findUnique({
            where: { id: BigInt(id) },
            include: { settings: true },
        });
        if (!user) {
            user = await prisma_1.default.user.create({
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
    static async updateSettings(userId, data) {
        return prisma_1.default.settings.update({
            where: { userId: BigInt(userId) },
            data,
        });
    }
    static async isBlocked(userId) {
        const user = await prisma_1.default.user.findUnique({ where: { id: BigInt(userId) } });
        return user?.blocked || false;
    }
}
exports.UserService = UserService;
class ChatService {
    static async createChat(userId, title) {
        return prisma_1.default.chat.create({
            data: {
                userId: BigInt(userId),
                title: title || 'New Chat',
            },
        });
    }
    static async getChats(userId) {
        return prisma_1.default.chat.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { updatedAt: 'desc' },
            include: { _count: { select: { messages: true } } },
        });
    }
    static async getMessages(chatId) {
        return prisma_1.default.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
        });
    }
    static async saveMessage(chatId, role, content, type = 'text', metadata) {
        await prisma_1.default.message.create({
            data: {
                chatId,
                role,
                content,
                type,
                metadata,
            },
        });
        await prisma_1.default.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
        });
    }
    static async clearChat(chatId) {
        return prisma_1.default.message.deleteMany({ where: { chatId } });
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=db.service.js.map