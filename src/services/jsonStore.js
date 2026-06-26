import fs from 'fs/promises';
import path from 'path';

const dataDir = path.resolve('data');

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

export async function readJsonFile(name, defaultValue) {
  await ensureDataDir();
  const filePath = path.join(dataDir, `${name}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

export async function writeJsonFile(name, data) {
  await ensureDataDir();
  const filePath = path.join(dataDir, `${name}.json`);
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf8');
  return data;
}
