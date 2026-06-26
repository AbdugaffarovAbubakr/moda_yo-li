import { readJsonFile, writeJsonFile } from './jsonStore.js';

const SETTINGS_FILE = 'settings';

export async function getSetting(key) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  return settings[key] ?? null;
}

export async function setSetting(key, value) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  settings[key] = value;
  await writeJsonFile(SETTINGS_FILE, settings);
  return { key, value };
}

export async function getGroupChat() {
  return getSetting('groupChat');
}

export async function setGroupChat(username) {
  const normalized = username.startsWith('@') ? username : `@${username}`;
  return setSetting('groupChat', normalized);
}
