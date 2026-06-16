import { Telegraf, Scenes, session } from 'telegraf';
import { config } from '../config';
import { UserService, ChatService } from '../services/db.service';
import { MyContext } from '../types/bot';
import { keyboards } from './keyboards';
import logger from '../utils/logger';
import { AIGateway } from '../ai/gateway';
import { Markup } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const bot = new Telegraf<MyContext>(config.BOT_TOKEN);
const ai = new AIGateway(config.AGENTROUTER_API_KEY);

// Middleware to register/get user
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const isBlocked = await UserService.isBlocked(ctx.from.id);
    if (isBlocked) return ctx.reply('عذراً، تم حظر حسابك من استخدام البوت.');

    ctx.dbUser = (await UserService.getOrCreateUser(ctx.from.id, ctx.from)) as any;
  }
  return next();
});

bot.use(session());

// Scenes setup (if needed)
const stage = new Scenes.Stage<MyContext>([]);
bot.use(stage.middleware());

// Commands
bot.start((ctx) => {
  const welcomeText = `
أهلاً بك يا ${ctx.from.first_name} في بوت الذكاء الاصطناعي الاحترافي! 🤖

أنا مساعدك الذكي المدعوم بأقوى نماذج الذكاء الاصطناعي (GPT-4, Claude, Gemini).
يمكنني مساعدتك في الدردشة، تحليل الصور، البرمجة، وتلخيص الملفات.

اختر ما تريد البدء به من الأسفل 👇
  `;
  return ctx.reply(welcomeText, keyboards.main());
});

bot.command('help', (ctx) => {
  return ctx.reply(
    'قائمة الأوامر المتوفرة:\n/start - البدء\n/chat - دردشة جديدة\n/models - تغيير النموذج\n/stats - إحصائياتي\n/settings - الإعدادات'
  );
});

bot.command('chat', async (ctx) => {
  const chat = await ChatService.createChat(ctx.from.id);
  return ctx.reply(
    `تم إنشاء جلسة دردشة جديدة بنجاح! ✅\nالنموذج الحالي: ${ctx.dbUser.settings?.preferredModel}\n\nيمكنك البدء بإرسال رسالتك الآن.`,
    keyboards.chatActions(chat.id)
  );
});

bot.command('models', (ctx) => {
  return ctx.reply(
    'اختر نموذج الذكاء الاصطناعي المفضل لديك:',
    keyboards.models(ctx.dbUser.settings?.preferredModel || 'gpt-4o')
  );
});

// Handle AI Messages (Text)
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const thinkingMsg = await ctx.reply('جاري التفكير... 💭');

  try {
    const chat = await ChatService.createChat(ctx.from.id); // In a real app, track current active chat in session
    const messages = [{ role: 'user', content: ctx.message.text }];

    // Get AI response
    const response = await ai.chat({
      model: ctx.dbUser.settings?.preferredModel || 'gpt-4o',
      messages: messages,
    });

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      undefined,
      response.content || 'عذراً، لم أستطع توليد رد.'
    );

    // Save to DB
    await ChatService.saveMessage(chat.id, 'user', ctx.message.text);
    await ChatService.saveMessage(chat.id, 'assistant', response.content || '');
  } catch (error) {
    logger.error('Bot Text Handler Error:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      undefined,
      'عذراً، حدث خطأ أثناء معالجة طلبك.'
    );
  }
});

// Handle Images
bot.on('photo', async (ctx) => {
  const photo = ctx.message.photo.pop();
  if (!photo) return;

  const fileLink = await ctx.telegram.getFileLink(photo.file_id);

  return ctx.reply(
    'تم استلام الصورة! 🖼️ ماذا تريد أن أفعل بها؟',
    Markup.inlineKeyboard([
      [Markup.button.callback('🔍 تحليل الصورة', `analyze_vision_${photo.file_id}`)],
      [Markup.button.callback('📝 استخراج النصوص (OCR)', `ocr_vision_${photo.file_id}`)],
    ])
  );
});

// Handle Files
bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  const thinkingMsg = await ctx.reply('جاري تحميل وتحليل الملف... 📄');

  try {
    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    // Here we would download and parse the file (PDF, DOCX, TXT)
    // For now, let's simulate AI analysis of the file metadata
    const response = await ai.chat({
      model: ctx.dbUser.settings?.preferredModel || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `لقد أرسلت لك ملفاً باسم ${doc.file_name}. هل يمكنك مساعدتي في تلخيصه؟`,
        },
      ],
    });

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      undefined,
      response.content || 'تم استلام الملف.'
    );
  } catch (error) {
    logger.error('File Handler Error:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      undefined,
      'حدث خطأ أثناء معالجة الملف.'
    );
  }
});

// Handle Audio
bot.on(['voice', 'audio'], async (ctx) => {
  const audio = 'voice' in ctx.message ? ctx.message.voice : ctx.message.audio;
  const thinkingMsg = await ctx.reply('جاري تحويل الصوت إلى نص... 🎤');

  try {
    const fileLink = await ctx.telegram.getFileLink(audio.file_id);
    const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const text = await ai.transcribe(buffer);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      undefined,
      `نص التسجيل: 📝\n\n${text}`
    );
  } catch (error) {
    logger.error('Audio Handler Error:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      undefined,
      'حدث خطأ أثناء معالجة الصوت.'
    );
  }
});

// Callback Queries
bot.on('callback_query', async (ctx: any) => {
  const data = ctx.callbackQuery.data;

  if (data === 'feature_chat') {
    return ctx.reply('أرسل أي رسالة لبدء الدردشة مع الذكاء الاصطناعي! 💬');
  }

  if (data.startsWith('select_model_')) {
    const model = data.replace('select_model_', '');
    await UserService.updateSettings(ctx.from.id, { preferredModel: model });
    await ctx.answerCbQuery(`تم تغيير النموذج إلى ${model} ✅`);
    return ctx.editMessageText(
      `تم تحديث النموذج المفضل! ⚙️\nالنموذج الحالي: ${model}`,
      keyboards.models(model)
    );
  }

  if (data.startsWith('analyze_vision_')) {
    const fileId = data.replace('analyze_vision_', '');
    const thinkingMsg = await ctx.reply('جاري تحليل الصورة... 🔍');

    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const description = await ai.vision({
        model: 'gpt-4o-vision',
        imageUrl: fileLink.toString(),
        prompt: 'صف هذه الصورة بدقة واستخرج أي نصوص موجودة فيها.',
        messages: [],
      });

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        thinkingMsg.message_id,
        undefined,
        `تحليل الصورة: 🖼️\n\n${description}`
      );
    } catch (error) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        thinkingMsg.message_id,
        undefined,
        'حدث خطأ أثناء تحليل الصورة.'
      );
    }
    return;
  }

  await ctx.answerCbQuery();
});

export { bot };
