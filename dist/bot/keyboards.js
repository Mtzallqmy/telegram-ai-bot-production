"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyboards = void 0;
const telegraf_1 = require("telegraf");
exports.keyboards = {
    main: () => {
        return telegraf_1.Markup.inlineKeyboard([
            [
                telegraf_1.Markup.button.callback('🤖 دردشة ذكية', 'feature_chat'),
                telegraf_1.Markup.button.callback('🖼️ تحليل الصور', 'feature_vision'),
            ],
            [
                telegraf_1.Markup.button.callback('📄 تلخيص الملفات', 'feature_files'),
                telegraf_1.Markup.button.callback('🎤 صوت لنص', 'feature_audio'),
            ],
            [
                telegraf_1.Markup.button.callback('🌍 ترجمة', 'feature_translate'),
                telegraf_1.Markup.button.callback('💻 برمجة', 'feature_code'),
            ],
            [
                telegraf_1.Markup.button.callback('📝 كتابة محتوى', 'feature_writing'),
                telegraf_1.Markup.button.callback('📚 شرح مفاهيم', 'feature_explain'),
            ],
            [
                telegraf_1.Markup.button.callback('⚙️ الإعدادات', 'settings_menu'),
                telegraf_1.Markup.button.callback('📊 إحصائياتي', 'my_stats'),
            ],
            [telegraf_1.Markup.button.callback('ℹ️ المساعدة', 'help_menu')],
        ]);
    },
    models: (currentModel) => {
        const models = [
            { name: 'GPT-4o', id: 'gpt-4o' },
            { name: 'Claude 3.5 Sonnet', id: 'claude-3-5-sonnet' },
            { name: 'Llama 3.1 405B', id: 'llama-3-1-405b' },
            { name: 'Gemini 1.5 Pro', id: 'gemini-1-5-pro' },
        ];
        return telegraf_1.Markup.inlineKeyboard(models.map((m) => [
            telegraf_1.Markup.button.callback(`${m.name} ${currentModel === m.id ? '✅' : ''}`, `select_model_${m.id}`),
        ]));
    },
    chatActions: (chatId) => {
        return telegraf_1.Markup.inlineKeyboard([
            [
                telegraf_1.Markup.button.callback('🔄 إعادة توليد', `regenerate_${chatId}`),
                telegraf_1.Markup.button.callback('🗑️ مسح السجل', `clear_${chatId}`),
            ],
            [telegraf_1.Markup.button.callback('⬅️ رجوع', 'main_menu')],
        ]);
    },
};
//# sourceMappingURL=keyboards.js.map