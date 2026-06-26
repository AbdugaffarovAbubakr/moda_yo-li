import { readJsonFile, writeJsonFile } from './jsonStore.js';

const USERS_FILE = 'users';

export async function findOrCreateUser(from) {
  const users = await readJsonFile(USERS_FILE, {});
  const existing = users[from.id];

  if (existing) {
    return { user: existing, isNew: false };
  }

  const user = {
    telegramId: from.id,
    username: from.username || null,
    firstName: from.first_name || null,
    lastName: from.last_name || null,
    language: null,
    registeredAt: new Date().toISOString(),
  };

  users[from.id] = user;
  await writeJsonFile(USERS_FILE, users);

  return { user, isNew: true };
}

export async function updateUserLanguage(telegramId, language) {
  const users = await readJsonFile(USERS_FILE, {});
  const id = String(telegramId);
  const existing = users[id] || {
    telegramId,
    username: null,
    firstName: null,
    lastName: null,
    language: null,
    registeredAt: new Date().toISOString(),
  };

  existing.language = language;
  users[id] = existing;
  await writeJsonFile(USERS_FILE, users);

  return existing;
}
