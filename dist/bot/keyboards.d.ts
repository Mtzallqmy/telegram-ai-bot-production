import { Markup } from 'telegraf';
export declare const keyboards: {
    main: () => Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
    models: (currentModel: string) => Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
    chatActions: (chatId: string) => Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
};
