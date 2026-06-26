import { readJsonFile, writeJsonFile } from './jsonStore.js';

const APPLICATIONS_FILE = 'applications';

export async function saveApplication(applicationData) {
  const applications = await readJsonFile(APPLICATIONS_FILE, []);
  applications.push(applicationData);
  await writeJsonFile(APPLICATIONS_FILE, applications);
  return applicationData;
}
