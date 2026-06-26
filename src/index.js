import { Telegraf, session } from 'telegraf';
import { config } from './config.js';
import { registerHandlers } from './bot/handlers.js';
import { ensureDefaultContent } from './services/contentService.js';

await ensureDefaultContent();

const bot = new Telegraf(config.botToken);

bot.use(session({ defaultSession: () => ({}) }));
registerHandlers(bot);

bot.catch((error, ctx) => {
  console.error('Bot error:', error);
  return ctx.reply('Xatolik yuz berdi. Iltimos, keyinroq urinib koring.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

await bot.launch();
console.log('Bot started');
