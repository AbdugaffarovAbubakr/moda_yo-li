import { Telegraf, session } from 'telegraf';
import { config } from './config.js';
import { registerHandlers } from './bot/handlers.js';
import { ensureDefaultContent } from './services/contentService.js';

await ensureDefaultContent();

const http = require('http');

const PORT = process.env.PORT || 3001;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
}).listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

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
