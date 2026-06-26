import 'dotenv/config';

const rootAdmin = process.env.ROOT_ADMIN || process.env.ADMIN_IDS?.split(',')[0]?.trim();
const required = ['BOT_TOKEN'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is required. Check your .env file.`);
  }
}

if (!rootAdmin) {
  throw new Error('ROOT_ADMIN is required. Check your .env file.');
}

export const config = {
  botToken: process.env.BOT_TOKEN,
  rootAdmin: Number(rootAdmin),
};

export function isRootAdmin(userId) {
  return Number(userId) === config.rootAdmin;
}

export function isAdmin(userId, adminIds = []) {
  const id = Number(userId);
  return isRootAdmin(id) || adminIds.includes(id);
}
