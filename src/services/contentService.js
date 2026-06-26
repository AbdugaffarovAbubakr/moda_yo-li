import { DEFAULT_CONTENT } from '../constants.js';
import { readJsonFile, writeJsonFile } from './jsonStore.js';

const CONTENT_FILE = 'content';

export async function ensureDefaultContent() {
  const content = await readJsonFile(CONTENT_FILE, {});
  let updated = false;

  for (const [language, items] of Object.entries(DEFAULT_CONTENT)) {
    if (!content[language]) {
      content[language] = {};
      updated = true;
    }

    for (const [key, text] of Object.entries(items)) {
      if (!content[language][key]) {
        content[language][key] = text;
        updated = true;
      }
    }
  }

  if (updated) {
    await writeJsonFile(CONTENT_FILE, content);
  }
}

export async function getContent(key, language) {
  const content = await readJsonFile(CONTENT_FILE, {});
  return content?.[language]?.[key] || DEFAULT_CONTENT[language]?.[key] || '';
}

export async function setContent(key, language, text) {
  const content = await readJsonFile(CONTENT_FILE, {});

  if (!content[language]) {
    content[language] = {};
  }

  content[language][key] = text;
  await writeJsonFile(CONTENT_FILE, content);
  return content[language];
}
