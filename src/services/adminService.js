import { readJsonFile, writeJsonFile } from './jsonStore.js';

const SETTINGS_FILE = 'settings';

export async function getAdmins() {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  return (settings.admins || []).map(Number);
}

export async function addAdmin(userId) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  const adminId = Number(userId);
  const admins = (settings.admins || []).map(Number);
  
  if (!admins.includes(adminId)) {
    admins.push(adminId);
  }
  
  await writeJsonFile(SETTINGS_FILE, { ...settings, admins });
  return admins;
}

export async function removeAdmin(userId) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  const adminId = Number(userId);
  const admins = (settings.admins || []).map(Number).filter(id => id !== adminId);
  
  await writeJsonFile(SETTINGS_FILE, { ...settings, admins });
  return admins;
}

export async function getApplicationStatus() {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  return settings.applicationStatus || 'open';
}

export async function setApplicationStatus(status) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  await writeJsonFile(SETTINGS_FILE, { ...settings, applicationStatus: status });
  return status;
}

export async function getGroups() {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  const groups = settings.groups || [];

  if (settings.groupChat && !groups.some((group) => group.username === settings.groupChat)) {
    return [
      {
        id: 1,
        name: settings.groupChat,
        username: settings.groupChat,
        addedAt: null,
      },
      ...groups,
    ];
  }

  return groups;
}

export async function addGroup(groupName, groupUsername = groupName) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  const groups = settings.groups || [];
  const normalized = groupUsername.startsWith('@') ? groupUsername : `@${groupUsername}`;

  if (groups.some((group) => group.username === normalized) || settings.groupChat === normalized) {
    return groups.find((group) => group.username === normalized) || {
      id: 1,
      name: normalized,
      username: normalized,
      addedAt: null,
    };
  }
  
  const group = {
    id: Date.now(),
    name: groupName || normalized,
    username: normalized,
    addedAt: new Date().toISOString(),
  };
  
  groups.push(group);
  await writeJsonFile(SETTINGS_FILE, { ...settings, groupChat: settings.groupChat || normalized, groups });
  return group;
}

export async function removeGroup(groupId) {
  const settings = await readJsonFile(SETTINGS_FILE, {});
  const id = Number(groupId);
  const groups = (settings.groups || []).filter(g => Number(g.id) !== id);
  const removedPrimary = id === 1;
  const nextGroupChat = removedPrimary ? (groups[0]?.username || null) : settings.groupChat;
  
  await writeJsonFile(SETTINGS_FILE, { ...settings, groupChat: nextGroupChat, groups });
  return groups;
}

export async function getPrimaryGroup() {
  const groups = await getGroups();
  return groups.length > 0 ? groups[0].username : null;
}
