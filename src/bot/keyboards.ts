import { Markup } from 'telegraf';

export const keyboards = {
  main: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🤖 دردشة ذكية', 'feature_chat'),
        Markup.button.callback('🖼️ تحليل الصور', 'feature_vision'),
      ],
      [
        Markup.button.callback('📄 تلخيص الملفات', 'feature_files'),
        Markup.button.callback('🎤 صوت لنص', 'feature_audio'),
      ],
      [
        Markup.button.callback('🌍 ترجمة', 'feature_translate'),
        Markup.button.callback('💻 برمجة', 'feature_code'),
      ],
      [
        Markup.button.callback('📝 كتابة محتوى', 'feature_writing'),
        Markup.button.callback('📚 شرح مفاهيم', 'feature_explain'),
      ],
      [
        Markup.button.callback('⚙️ الإعدادات', 'settings_menu'),
        Markup.button.callback('📊 إحصائياتي', 'my_stats'),
      ],
      [Markup.button.callback('ℹ️ المساعدة', 'help_menu')],
    ]);
  },

  models: (currentModel: string) => {
    const models = [
      { name: 'GPT-4o', id: 'gpt-4o' },
      { name: 'Claude 3.5 Sonnet', id: 'claude-3-5-sonnet' },
      { name: 'Llama 3.1 405B', id: 'llama-3-1-405b' },
      { name: 'Gemini 1.5 Pro', id: 'gemini-1-5-pro' },
    ];

    return Markup.inlineKeyboard(
      models.map((m) => [
        Markup.button.callback(
          `${m.name} ${currentModel === m.id ? '✅' : ''}`,
          `select_model_${m.id}`
        ),
      ])
    );
  },

  chatActions: (chatId: string) => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 إعادة توليد', `regenerate_${chatId}`),
        Markup.button.callback('🗑️ مسح السجل', `clear_${chatId}`),
      ],
      [Markup.button.callback('⬅️ رجوع', 'main_menu')],
    ]);
  },
};
