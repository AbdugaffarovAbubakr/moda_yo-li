import { readJsonFile } from './jsonStore.js';

export async function sendBroadcasts(bot, message, targetLanguage = null) {
  const users = await readJsonFile('users', {});
  const userIds = Object.keys(users);

  let sent = 0;
  let failed = 0;

  for (const telegramId of userIds) {
    const user = users[telegramId];

    // Filter by language if specified
    if (targetLanguage && user.language !== targetLanguage) {
      continue;
    }

    try {
      await bot.telegram.sendMessage(Number(telegramId), message);
      sent++;
    } catch (error) {
      console.error(`Failed to send broadcast to ${telegramId}:`, error.message);
      failed++;
    }
  }

  return { sent, failed, total: userIds.length };
}
