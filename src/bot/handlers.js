import { randomUUID } from 'crypto';
import { Markup } from 'telegraf';
import { ADMIN_CONTENT_BUTTONS, BUTTONS, CONTENT_KEYS, COURSES, FASHION_DIRECTIONS, REGION_DISTRICTS } from '../constants.js';
import { config, isAdmin, isRootAdmin } from '../config.js';
import { getContent, setContent } from '../services/contentService.js';
import { setGroupChat } from '../services/settingsService.js';
import { findOrCreateUser, updateUserLanguage } from '../services/userService.js';
import { saveApplication } from '../services/applicationService.js';
import {
  addAdmin,
  addGroup,
  getAdmins,
  getApplicationStatus,
  getGroups,
  removeAdmin,
  removeGroup,
  setApplicationStatus,
} from '../services/adminService.js';
import { sendBroadcasts } from '../services/broadcastService.js';
import { exportApplicationsToExcel } from '../services/excelExport.js';
import {
  adminAdminListKeyboard,
  adminAdminsKeyboard,
  districtKeyboard,
  adminLanguageKeyboard,
  adminContentKeyboard,
  adminPanelKeyboard,
  cancelKeyboard,
  courseKeyboard,
  fashionDirectionKeyboard,
  genderKeyboard,
  languageKeyboard,
  mainKeyboard,
  optionalKeyboard,
  phoneKeyboard,
  regionKeyboard,
  submitApplicationKeyboard,
  yesNoKeyboard,
} from './keyboards.js';
import { ADMIN_PANEL_TEXT, ADMIN_TEXT, formatApplicationMessage, formatNewUserMessage, TEXT } from './messages.js';

async function hasAdminAccess(userId) {
  const admins = await getAdmins();
  return isAdmin(userId, admins);
}

function getLanguage(ctx) {
  return ctx.session.language || 'uz';
}

async function showMainMenu(ctx, language) {
  const text = await getContent('start', language);
  return ctx.reply(text, mainKeyboard(language, await hasAdminAccess(ctx.from.id)));
}

async function syncUser(ctx) {
  const { user, isNew } = await findOrCreateUser(ctx.from);
  ctx.session.language = user.language || ctx.session.language;

  if (isNew) {
    await sendGroupMessage(ctx, formatNewUserMessage(user));
  }

  return user;
}

async function sendGroupMessage(ctx, text) {
  const groups = await getGroups();
  const groupChats = groups.map((group) => group.username);

  if (!groupChats.length) {
    console.warn(TEXT.groupNotConfigured);
    return false;
  }

  for (const groupChat of groupChats) {
    await ctx.telegram.sendMessage(groupChat, text);
  }

  return true;
}

function getTelegramFileMethod(file) {
  if (file.fileType === 'photo') {
    return 'sendPhoto';
  }

  return 'sendDocument';
}

async function sendGroupApplication(ctx, user, application, applicationId) {
  const groups = await getGroups();
  const groupChats = groups.map((group) => group.username);

  if (!groupChats.length) {
    console.warn(TEXT.groupNotConfigured);
    return false;
  }

  for (const groupChat of groupChats) {
    await ctx.telegram.sendMessage(groupChat, formatApplicationMessage(user, application, applicationId));
  }

  const sentLabels = [
    { key: 'passportFile', labelUz: 'Pasport/ID fayli', labelRu: 'Паспорт/ID файл' },
    { key: 'portraitFile', labelUz: '3x4 rasm', labelRu: 'Фото 3x4' },
  ];

  for (const item of sentLabels) {
    const file = application[item.key];

    if (!file) continue;

    const labelUz = `${item.labelUz}\nID: ${applicationId}`;
    const labelRu = `${item.labelRu}\nID: ${applicationId}`;

    for (const groupChat of groupChats) {
      await ctx.telegram[getTelegramFileMethod(file)](groupChat, file.fileId, {
        caption:
          ctx.session.language === 'ru'
            ? labelRu
            : labelUz,
      });
    }
  }

  const workFiles = application.workFiles || [];

  for (let index = 0; index < workFiles.length; index += 1) {
    const file = workFiles[index];
    const labelUz = `Ish fayli ${index + 1}\nID: ${applicationId}`;
    const labelRu = `Файл работы ${index + 1}\nID: ${applicationId}`;

    for (const groupChat of groupChats) {
      await ctx.telegram[getTelegramFileMethod(file)](groupChat, file.fileId, {
        caption: ctx.session.language === 'ru' ? labelRu : labelUz,
      });
    }
  }

  return true;
}

function contentKeyByButton(text, language) {
  const buttons = BUTTONS[language];

  if (text === buttons.about) return 'about';
  if (text === buttons.rules) return 'rules';
  if (text === buttons.faq) return 'faq';
  if (text === buttons.contact) return 'contact';

  return null;
}

function isValidBirthDate(text) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
    return false;
  }

  const [day, month, year] = text.split('.').map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isTooLong(text) {
  return text.trim().length > 500;
}

function isValidPhone(text) {
  const normalized = text.replace(/[\s\-()]/g, '');
  return /^\+?\d{7,20}$/.test(normalized);
}

function yesNoValue(message, buttons) {
  if (message === buttons.yes) return true;
  if (message === buttons.no) return false;
  return null;
}

function getUploadedFile(ctx) {
  if (ctx.message?.document) {
    const { document } = ctx.message;
    return {
      fileId: document.file_id,
      fileType: 'document',
      fileName: document.file_name || null,
      mimeType: document.mime_type || null,
    };
  }

  if (ctx.message?.photo) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    return {
      fileId: photo.file_id,
      fileType: 'photo',
      fileName: null,
      mimeType: photo.mime_type || 'image/jpeg',
    };
  }

  return null;
}

function isSupportedFile(file) {
  if (!file) return false;
  if (file.fileType === 'photo') return true;

  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.fileName || '').toLowerCase();

  return (
    mime === 'application/pdf' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'image/jpeg' ||
    name.endsWith('.pdf') ||
    name.endsWith('.docx') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.jpg')
  );
}

async function finishApplication(ctx, user) {
  const app = ctx.session.application;
  const applicationId = randomUUID();

  const applicationData = {
    id: applicationId,
    telegramId: user.telegramId,
    username: user.username || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    language: user.language || getLanguage(ctx),
    region: app.region,
    district: app.district,
    fullName: app.fullName,
    birthDate: app.birthDate,
    gender: app.gender,
    isStudent: app.isStudent,
    educationInstitution: app.educationInstitution || null,
    specialty: app.specialty || null,
    course: app.course || null,
    phone: app.phone,
    telegramUsername: app.telegramUsername || null,
    email: app.email || null,
    interestedInFashion: app.interestedInFashion,
    fashionDirection: app.fashionDirection || null,
    hasExperience: app.hasExperience,
    aboutSelf: app.aboutSelf,
    motivation: app.motivation,
    hasReadyWorks: app.hasReadyWorks,
    workFiles: app.workFiles || [],
    savedAt: new Date().toISOString(),
  };

  await saveApplication(applicationData);
  ctx.session.application = null;
  await sendGroupApplication(ctx, user, app, applicationId);

  const language = user.language || getLanguage(ctx);
  return ctx.reply(
    language === 'uz' ? TEXT.applicationSavedUz : TEXT.applicationSavedRu,
    mainKeyboard(language, await hasAdminAccess(ctx.from.id)),
  );
}

function applicationSummary(application, language) {
  const gender = application.gender === 'male' ? BUTTONS[language].male : BUTTONS[language].female;

  return [
    language === 'uz' ? TEXT.confirmApplicationUz : TEXT.confirmApplicationRu,
    '',
    `Hudud: ${application.region}`,
    `Tuman/shahar: ${application.district}`,
    `FIO: ${application.fullName}`,
    `Tug'ilgan sana: ${application.birthDate}`,
    `Jinsi: ${gender}`,
    `Talaba: ${application.isStudent ? BUTTONS[language].yes : BUTTONS[language].no}`,
    `O'quv muassasasi: ${application.educationInstitution || '-'}`,
    `Mutaxassisligi: ${application.specialty || '-'}`,
    `Kursi: ${application.course || '-'}`,
    `Telefon: ${application.phone}`,
    `Telegram username: ${application.telegramUsername || '-'}`,
    `Elektron pochta: ${application.email || '-'}`,
    `Moda/ijodga qiziqadi: ${application.interestedInFashion ? BUTTONS[language].yes : BUTTONS[language].no}`,
    `Yo'nalish: ${application.fashionDirection || '-'}`,
    `Tajribasi bor: ${application.hasExperience ? BUTTONS[language].yes : BUTTONS[language].no}`,
    `O'zi haqida: ${application.aboutSelf}`,
    `Motivatsiya: ${application.motivation}`,
  ].join('\n');
}

function formatGroupsList(groups) {
  if (!groups.length) {
    return "Ulangan guruhlar yo'q.\n\nYangi guruh qo'shish uchun username yuboring. Masalan: @guruh_username";
  }

  return [
    'Ulangan guruhlar:',
    '',
    ...groups.map((group, index) => `${index + 1}. ${group.username}`),
    '',
    "Yangi guruh qo'shish uchun @username yuboring yoki o'chirish uchun ro'yxatdan guruhni tanlang.",
  ].join('\n');
}

function groupManagementKeyboard(language, groups) {
  const rows = groups.map((group) => [`O'chirish: ${group.username}`]);
  rows.push(["Yangi guruh qo'shish"]);
  rows.push([BUTTONS[language].back]);
  return Markup.keyboard(rows).resize();
}

function formatAdminsList(admins) {
  const allAdmins = [config.rootAdmin, ...admins.filter((id) => id !== config.rootAdmin)];

  return [
    "Adminlar ro'yxati:",
    '',
    ...allAdmins.map((id) => `${id === config.rootAdmin ? 'ROOT ' : ''}${id}`),
  ].join('\n');
}

function parseAdminId(text) {
  const match = text.match(/\d{5,}/);
  return match ? Number(match[0]) : null;
}

export function registerHandlers(bot) {
  bot.start(async (ctx) => {
    const user = await syncUser(ctx);

    if (!user.language) {
      return ctx.reply(TEXT.chooseLanguage, languageKeyboard());
    }

    ctx.session.language = user.language;
    return showMainMenu(ctx, user.language);
  });

  bot.action(/^lang:(uz|ru)$/, async (ctx) => {
    const language = ctx.match[1];
    await updateUserLanguage(ctx.from.id, language);
    ctx.session.language = language;
    await ctx.answerCbQuery(language === 'uz' ? TEXT.languageSavedUz : TEXT.languageSavedRu);
    await ctx.reply(language === 'uz' ? TEXT.languageSavedUz : TEXT.languageSavedRu);
    return showMainMenu(ctx, language);
  });

  bot.command('set', async (ctx) => {
    if (!await hasAdminAccess(ctx.from.id)) {
      return ctx.reply(TEXT.adminOnly);
    }

    const match = ctx.message.text.match(/^\/set\s+(uz|ru)\s+(\w+)\s+([\s\S]+)/);

    if (!match || !CONTENT_KEYS.includes(match[2])) {
      return ctx.reply(TEXT.unknownAdminCommand);
    }

    const [, language, key, text] = match;
    await setContent(key, language, text.trim());
    return ctx.reply(`Saqlandi: ${language}/${key}`);
  });

  bot.command('setgroup', async (ctx) => {
    if (!await hasAdminAccess(ctx.from.id)) {
      return ctx.reply(TEXT.adminOnly);
    }

    const username = ctx.message.text.split(/\s+/)[1];

    if (!username || !/^@?[a-zA-Z0-9_]{5,}$/.test(username)) {
      return ctx.reply("Format: /setgroup @guruh_username");
    }

    const group = await setGroupChat(username);
    await addGroup(group.value, group.value);
    return ctx.reply(`${TEXT.groupSaved}\n${group.value}`);
  });

  bot.command('admin', async (ctx) => {
    if (!await hasAdminAccess(ctx.from.id)) {
      return ctx.reply(TEXT.adminOnly);
    }

    return ctx.reply(ADMIN_PANEL_TEXT, adminPanelKeyboard(getLanguage(ctx)));
  });

  bot.on(['photo', 'document'], async (ctx) => {
    const user = await syncUser(ctx);
    const language = user.language || getLanguage(ctx);
    const application = ctx.session.application;

    if (!application?.step) {
      return showMainMenu(ctx, language);
    }

    const file = getUploadedFile(ctx);

    if (!file || !isSupportedFile(file)) {
      return ctx.reply(language === 'uz' ? TEXT.invalidFileUz : TEXT.invalidFileRu, cancelKeyboard(language));
    }

    if (application.step === 'passportFile') {
      ctx.session.application = {
        ...application,
        step: 'portraitFile',
        passportFile: file,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterPortraitUz : TEXT.enterPortraitRu, cancelKeyboard(language));
    }

    if (application.step === 'portraitFile') {
      ctx.session.application = {
        ...application,
        step: 'readyWorks',
        portraitFile: file,
      };

      return ctx.reply(language === 'uz' ? TEXT.askReadyWorksUz : TEXT.askReadyWorksRu, yesNoKeyboard(language));
    }

    if (application.step === 'workFiles') {
      const workFiles = application.workFiles || [];

      if (workFiles.length >= 2) {
        return ctx.reply(language === 'uz' ? TEXT.maxWorkFilesUz : TEXT.maxWorkFilesRu, cancelKeyboard(language));
      }

      const updatedFiles = [...workFiles, file];
      ctx.session.application = {
        ...application,
        workFiles: updatedFiles,
      };

      if (updatedFiles.length === 2) {
        ctx.session.application = {
          ...ctx.session.application,
          step: 'confirm',
        };
        return ctx.reply(applicationSummary(ctx.session.application, language), submitApplicationKeyboard(language));
      }

      return ctx.reply(language === 'uz' ? TEXT.workFileReceivedUz : TEXT.workFileReceivedRu, cancelKeyboard(language));
    }

    return ctx.reply(language === 'uz' ? TEXT.invalidFileUz : TEXT.invalidFileRu, cancelKeyboard(language));
  });

  bot.on('contact', async (ctx) => {
    const user = await syncUser(ctx);
    const language = user.language || getLanguage(ctx);
    const application = ctx.session.application;
    const contact = ctx.message?.contact;

    if (!application?.step || application.step !== 'phone') {
      return showMainMenu(ctx, language);
    }

    if (!contact?.phone_number) {
      return ctx.reply(language === 'uz' ? TEXT.enterPhoneUz : TEXT.enterPhoneRu, phoneKeyboard(language));
    }

    if (contact.user_id && contact.user_id !== ctx.from.id) {
      return ctx.reply(language === 'uz' ? TEXT.invalidPhoneContactUz : TEXT.invalidPhoneContactRu, phoneKeyboard(language));
    }

    ctx.session.application = {
      ...application,
      step: 'telegramUsername',
      phone: contact.phone_number,
    };

    return ctx.reply(
      language === 'uz' ? TEXT.enterTelegramUsernameUz : TEXT.enterTelegramUsernameRu,
      optionalKeyboard(language),
    );
  });

  bot.on('text', async (ctx) => {
    const user = await syncUser(ctx);
    const language = user.language || getLanguage(ctx);
    const buttons = BUTTONS[language];
    const message = ctx.message.text;
    const userIsAdmin = await hasAdminAccess(ctx.from.id);

    if (!user.language) {
      return ctx.reply(TEXT.chooseLanguage, languageKeyboard());
    }

    if (ctx.session.application?.step === 'passportFile') {
      return ctx.reply(language === 'uz' ? TEXT.enterPassportUz : TEXT.enterPassportRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'portraitFile') {
      return ctx.reply(language === 'uz' ? TEXT.enterPortraitUz : TEXT.enterPortraitRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'workFiles') {
      const workFiles = ctx.session.application.workFiles || [];

      if (message === buttons.cancel) {
        ctx.session.application = null;
        await ctx.reply(
          language === 'uz' ? TEXT.cancelledUz : TEXT.cancelledRu,
          mainKeyboard(language, userIsAdmin),
        );
        return showMainMenu(ctx, language);
      }

      if (!workFiles.length) {
        return ctx.reply(language === 'uz' ? TEXT.requireWorkFilesUz : TEXT.requireWorkFilesRu, cancelKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'confirm',
      };
      return ctx.reply(applicationSummary(ctx.session.application, language), submitApplicationKeyboard(language));
    }

    if (message === buttons.language) {
      return ctx.reply(TEXT.chooseLanguage, languageKeyboard());
    }

    if (ctx.session.application?.step === 'confirm') {
      if (message === buttons.confirm) {
        return finishApplication(ctx, user);
      }

      if (message === buttons.edit) {
        ctx.session.application = { step: 'region' };
        return ctx.reply(
          language === 'uz' ? TEXT.chooseRegionUz : TEXT.chooseRegionRu,
          regionKeyboard(language),
        );
      }

      if (message === buttons.cancel) {
        ctx.session.application = null;
        return ctx.reply(
          language === 'uz' ? TEXT.cancelledUz : TEXT.cancelledRu,
          mainKeyboard(language, userIsAdmin),
        );
      }

      return ctx.reply(
        language === 'uz' ? TEXT.confirmApplicationUz : TEXT.confirmApplicationRu,
        submitApplicationKeyboard(language),
      );
    }

    if (ctx.session.application?.step === 'readyWorks') {
      const hasReadyWorks = yesNoValue(message, buttons);

      if (hasReadyWorks === null) {
        return ctx.reply(language === 'uz' ? TEXT.askReadyWorksUz : TEXT.askReadyWorksRu, yesNoKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'workFiles',
        hasReadyWorks,
      };

      return ctx.reply(
        language === 'uz'
          ? hasReadyWorks
            ? TEXT.enterWorkFilesYesUz
            : TEXT.enterWorkFilesNoUz
          : hasReadyWorks
            ? TEXT.enterWorkFilesYesRu
            : TEXT.enterWorkFilesNoRu,
        cancelKeyboard(language),
      );
    }

    if (message === buttons.cancel) {
      ctx.session.application = null;
      ctx.session.adminAction = null;
      await ctx.reply(
        language === 'uz' ? TEXT.cancelledUz : TEXT.cancelledRu,
        mainKeyboard(language, userIsAdmin),
      );
      return showMainMenu(ctx, language);
    }

    if (message === buttons.adminPanel && userIsAdmin) {
      ctx.session.adminAction = null;
      return ctx.reply(ADMIN_PANEL_TEXT, adminPanelKeyboard(language));
    }

    if (userIsAdmin && message === buttons.back) {
      ctx.session.adminAction = null;
      return showMainMenu(ctx, language);
    }

    if (userIsAdmin && message === buttons.adminSetGroup) {
      const groups = await getGroups();
      ctx.session.adminAction = { step: 'groupMenu' };
      return ctx.reply(formatGroupsList(groups), groupManagementKeyboard(language, groups));
    }

    if (userIsAdmin && message === buttons.adminEditMessages) {
      return ctx.reply(
        language === 'uz' ? 'Matnlarni tahrirlash uchun qaysi bo\'limni tanlang:' : 'Выберите раздел для редактирования текста:',
        adminContentKeyboard(language),
      );
    }

    if (userIsAdmin && message === buttons.adminExportExcel) {
      const filePath = await exportApplicationsToExcel();

      if (!filePath) {
        return ctx.reply("Hozircha arizalar yo'q.", adminPanelKeyboard(language));
      }

      return ctx.replyWithDocument({ source: filePath, filename: filePath.split(/[\\/]/).pop() }, {
        caption: 'Arizalar Excel fayli',
        ...adminPanelKeyboard(language),
      });
    }

    if (userIsAdmin && message === buttons.adminBroadcast) {
      ctx.session.adminAction = { step: 'broadcast' };
      return ctx.reply(ADMIN_TEXT.broadcastMessage, cancelKeyboard(language));
    }

    if (userIsAdmin && message === buttons.adminManageGroups) {
      const groups = await getGroups();
      ctx.session.adminAction = { step: 'groupMenu' };
      return ctx.reply(formatGroupsList(groups), groupManagementKeyboard(language, groups));
    }

    if (userIsAdmin && message === buttons.adminToggleApplications) {
      const currentStatus = await getApplicationStatus();
      const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
      await setApplicationStatus(nextStatus);
      return ctx.reply(
        nextStatus === 'open' ? ADMIN_TEXT.applicationStatusOpen : ADMIN_TEXT.applicationStatusClosed,
        adminPanelKeyboard(language),
      );
    }

    if (userIsAdmin && message === buttons.adminManageAdmins) {
      ctx.session.adminAction = { step: 'adminMenu' };
      return ctx.reply(formatAdminsList(await getAdmins()), adminAdminsKeyboard(language));
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'broadcast') {
      const result = await sendBroadcasts(bot, message);
      ctx.session.adminAction = null;
      return ctx.reply(
        `${ADMIN_TEXT.broadcastSent}\nYuborildi: ${result.sent}\nXato: ${result.failed}`,
        adminPanelKeyboard(language),
      );
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'groupMenu') {
      const selectedUsername = message.match(/@[a-zA-Z0-9_]{5,}/)?.[0];

      if (selectedUsername && message.trim() !== selectedUsername) {
        const groups = await getGroups();
        const group = groups.find((item) => item.username === selectedUsername);

        if (!group) {
          return ctx.reply(formatGroupsList(groups), groupManagementKeyboard(language, groups));
        }

        await removeGroup(group.id);
        const updatedGroups = await getGroups();
        return ctx.reply(ADMIN_TEXT.groupRemoved, groupManagementKeyboard(language, updatedGroups));
      }

      if (!/^@?[a-zA-Z0-9_]{5,}$/.test(message)) {
        return ctx.reply(ADMIN_TEXT.enterGroup, groupManagementKeyboard(language, await getGroups()));
      }

      const group = await addGroup(message, message);
      const updatedGroups = await getGroups();
      return ctx.reply(`${ADMIN_TEXT.groupAdded}\n${group.username}`, groupManagementKeyboard(language, updatedGroups));
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'adminMenu') {
      if (message.includes("Admin qo'shish")) {
        ctx.session.adminAction = { step: 'adminAdd' };
        return ctx.reply("Qo'shiladigan admin Telegram ID raqamini yuboring:", cancelKeyboard(language));
      }

      if (message.includes("Admin o'chirish")) {
        const admins = await getAdmins();
        ctx.session.adminAction = { step: 'adminRemove' };
        return ctx.reply(formatAdminsList(admins), adminAdminListKeyboard(language, [config.rootAdmin, ...admins], config.rootAdmin));
      }

      if (message.includes('Admin r')) {
        return ctx.reply(formatAdminsList(await getAdmins()), adminAdminsKeyboard(language));
      }

      return ctx.reply(formatAdminsList(await getAdmins()), adminAdminsKeyboard(language));
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'adminAdd') {
      const adminId = parseAdminId(message);

      if (!adminId) {
        return ctx.reply("Telegram ID faqat raqamlardan iborat bo'lishi kerak.", cancelKeyboard(language));
      }

      await addAdmin(adminId);
      ctx.session.adminAction = { step: 'adminMenu' };
      return ctx.reply(ADMIN_TEXT.adminAdded, adminAdminsKeyboard(language));
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'adminRemove') {
      const adminId = parseAdminId(message);
      const admins = await getAdmins();

      if (!adminId) {
        return ctx.reply("O'chiriladigan admin ID raqamini yuboring.", adminAdminListKeyboard(language, [config.rootAdmin, ...admins], config.rootAdmin));
      }

      if (isRootAdmin(adminId)) {
        return ctx.reply(ADMIN_TEXT.cannotRemoveRootAdmin, adminAdminListKeyboard(language, [config.rootAdmin, ...admins], config.rootAdmin));
      }

      if (!admins.includes(adminId)) {
        return ctx.reply(ADMIN_TEXT.adminNotFound, adminAdminListKeyboard(language, [config.rootAdmin, ...admins], config.rootAdmin));
      }

      await removeAdmin(adminId);
      ctx.session.adminAction = { step: 'adminMenu' };
      return ctx.reply(ADMIN_TEXT.adminRemoved, adminAdminsKeyboard(language));
    }

    if (userIsAdmin) {
      const contentButtonKey = Object.entries(ADMIN_CONTENT_BUTTONS).find(
        ([buttonKey]) => message === buttons[buttonKey],
      );

      if (contentButtonKey) {
        ctx.session.adminAction = {
          step: 'contentLanguage',
          contentKey: contentButtonKey[1],
        };
        return ctx.reply(ADMIN_TEXT.chooseLanguage, adminLanguageKeyboard(language));
      }
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'group') {
      if (!/^@?[a-zA-Z0-9_]{5,}$/.test(message)) {
        return ctx.reply(ADMIN_TEXT.enterGroup, cancelKeyboard(language));
      }

      const group = await setGroupChat(message);
      await addGroup(group.value, group.value);
      ctx.session.adminAction = null;
      return ctx.reply(`${TEXT.groupSaved}\n${group.value}`, adminPanelKeyboard(language));
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'contentLanguage') {
      const contentLanguage = message.includes('🇺🇿') ? 'uz' : message.includes('🇷🇺') ? 'ru' : null;

      if (!contentLanguage) {
        return ctx.reply(ADMIN_TEXT.chooseLanguage, adminLanguageKeyboard(language));
      }

      ctx.session.adminAction = {
        ...ctx.session.adminAction,
        step: 'contentText',
        language: contentLanguage,
      };

      return ctx.reply(ADMIN_TEXT.enterContent, cancelKeyboard(language));
    }

    if (userIsAdmin && ctx.session.adminAction?.step === 'contentText') {
      const { contentKey, language: contentLanguage } = ctx.session.adminAction;
      await setContent(contentKey, contentLanguage, message.trim());
      ctx.session.adminAction = null;
      return ctx.reply(ADMIN_TEXT.contentSaved, adminPanelKeyboard(language));
    }

    if (message === buttons.apply) {
      const applicationStatus = await getApplicationStatus();

      if (applicationStatus !== 'open') {
        return ctx.reply(
          language === 'uz' ? ADMIN_TEXT.applicationClosedUz : 'Прием заявок сейчас закрыт. Попробуйте позже.',
          mainKeyboard(language, userIsAdmin),
        );
      }

      ctx.session.application = { step: 'region' };
      return ctx.reply(
        language === 'uz' ? TEXT.chooseRegionUz : TEXT.chooseRegionRu,
        regionKeyboard(language),
      );
    }

    if (ctx.session.application?.step === 'region') {
      if (!REGION_DISTRICTS[message]) {
        return ctx.reply(language === 'uz' ? TEXT.chooseRegionUz : TEXT.chooseRegionRu, regionKeyboard(language));
      }

      ctx.session.application = {
        step: 'district',
        region: message,
      };

      return ctx.reply(
        language === 'uz' ? TEXT.chooseDistrictUz : TEXT.chooseDistrictRu,
        districtKeyboard(language, message),
      );
    }

    if (ctx.session.application?.step === 'district') {
      const { region } = ctx.session.application;
      const districts = REGION_DISTRICTS[region] || [];

      if (!districts.includes(message)) {
        return ctx.reply(
          language === 'uz' ? TEXT.chooseDistrictUz : TEXT.chooseDistrictRu,
          districtKeyboard(language, region),
        );
      }

      ctx.session.application = {
        step: 'fullName',
        region,
        district: message,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterFullNameUz : TEXT.enterFullNameRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'fullName') {
      const fullName = message.trim();

      if (fullName.length < 5) {
        return ctx.reply(language === 'uz' ? TEXT.enterFullNameUz : TEXT.enterFullNameRu, cancelKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'birthDate',
        fullName,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterBirthDateUz : TEXT.enterBirthDateRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'birthDate') {
      const birthDate = message.trim();

      if (!isValidBirthDate(birthDate)) {
        return ctx.reply(language === 'uz' ? TEXT.invalidBirthDateUz : TEXT.invalidBirthDateRu, cancelKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'gender',
        birthDate,
      };

      return ctx.reply(language === 'uz' ? TEXT.chooseGenderUz : TEXT.chooseGenderRu, genderKeyboard(language));
    }

    if (ctx.session.application?.step === 'gender') {
      const gender = message === buttons.male ? 'male' : message === buttons.female ? 'female' : null;

      if (!gender) {
        return ctx.reply(language === 'uz' ? TEXT.chooseGenderUz : TEXT.chooseGenderRu, genderKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'student',
        gender,
      };

      return ctx.reply(language === 'uz' ? TEXT.askStudentUz : TEXT.askStudentRu, yesNoKeyboard(language));
    }

    if (ctx.session.application?.step === 'student') {
      const isStudent = yesNoValue(message, buttons);

      if (isStudent === null) {
        return ctx.reply(language === 'uz' ? TEXT.askStudentUz : TEXT.askStudentRu, yesNoKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        isStudent,
        step: isStudent ? 'educationInstitution' : 'phone',
      };

      if (isStudent) {
        return ctx.reply(
          language === 'uz' ? TEXT.enterEducationInstitutionUz : TEXT.enterEducationInstitutionRu,
          cancelKeyboard(language),
        );
      }

      return ctx.reply(language === 'uz' ? TEXT.enterPhoneUz : TEXT.enterPhoneRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'educationInstitution') {
      const educationInstitution = message.trim();

      if (educationInstitution.length < 2) {
        return ctx.reply(
          language === 'uz' ? TEXT.enterEducationInstitutionUz : TEXT.enterEducationInstitutionRu,
          cancelKeyboard(language),
        );
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'specialty',
        educationInstitution,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterSpecialtyUz : TEXT.enterSpecialtyRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'specialty') {
      const specialty = message.trim();

      if (specialty.length < 2) {
        return ctx.reply(language === 'uz' ? TEXT.enterSpecialtyUz : TEXT.enterSpecialtyRu, cancelKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'course',
        specialty,
      };

      return ctx.reply(language === 'uz' ? TEXT.chooseCourseUz : TEXT.chooseCourseRu, courseKeyboard(language));
    }

    if (ctx.session.application?.step === 'course') {
      if (!COURSES.includes(message)) {
        return ctx.reply(language === 'uz' ? TEXT.chooseCourseUz : TEXT.chooseCourseRu, courseKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'phone',
        course: message,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterPhoneUz : TEXT.enterPhoneRu, phoneKeyboard(language));
    }

    if (ctx.session.application?.step === 'phone') {
      const phone = message.trim();

      if (!isValidPhone(phone)) {
        return ctx.reply(language === 'uz' ? TEXT.enterPhoneUz : TEXT.enterPhoneRu, phoneKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'telegramUsername',
        phone,
      };

      return ctx.reply(
        language === 'uz' ? TEXT.enterTelegramUsernameUz : TEXT.enterTelegramUsernameRu,
        optionalKeyboard(language),
      );
    }

    if (ctx.session.application?.step === 'telegramUsername') {
      ctx.session.application = {
        ...ctx.session.application,
        step: 'email',
        telegramUsername: message === buttons.skip ? null : message.trim(),
      };

      return ctx.reply(language === 'uz' ? TEXT.enterEmailUz : TEXT.enterEmailRu, optionalKeyboard(language));
    }

    if (ctx.session.application?.step === 'email') {
      ctx.session.application = {
        ...ctx.session.application,
        step: 'fashionInterest',
        email: message === buttons.skip ? null : message.trim(),
      };

      return ctx.reply(
        language === 'uz' ? TEXT.askFashionInterestUz : TEXT.askFashionInterestRu,
        yesNoKeyboard(language),
      );
    }

    if (ctx.session.application?.step === 'fashionInterest') {
      const interestedInFashion = yesNoValue(message, buttons);

      if (interestedInFashion === null) {
        return ctx.reply(
          language === 'uz' ? TEXT.askFashionInterestUz : TEXT.askFashionInterestRu,
          yesNoKeyboard(language),
        );
      }

      ctx.session.application = {
        ...ctx.session.application,
        interestedInFashion,
        step: interestedInFashion ? 'fashionDirection' : 'experience',
      };

      if (interestedInFashion) {
        return ctx.reply(
          language === 'uz' ? TEXT.chooseFashionDirectionUz : TEXT.chooseFashionDirectionRu,
          fashionDirectionKeyboard(language),
        );
      }

      return ctx.reply(language === 'uz' ? TEXT.askExperienceUz : TEXT.askExperienceRu, yesNoKeyboard(language));
    }

    if (ctx.session.application?.step === 'fashionDirection') {
      if (!FASHION_DIRECTIONS.includes(message)) {
        return ctx.reply(
          language === 'uz' ? TEXT.chooseFashionDirectionUz : TEXT.chooseFashionDirectionRu,
          fashionDirectionKeyboard(language),
        );
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'experience',
        fashionDirection: message,
      };

      return ctx.reply(language === 'uz' ? TEXT.askExperienceUz : TEXT.askExperienceRu, yesNoKeyboard(language));
    }

    if (ctx.session.application?.step === 'experience') {
      const hasExperience = yesNoValue(message, buttons);

      if (hasExperience === null) {
        return ctx.reply(language === 'uz' ? TEXT.askExperienceUz : TEXT.askExperienceRu, yesNoKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'aboutSelf',
        hasExperience,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterAboutSelfUz : TEXT.enterAboutSelfRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'aboutSelf') {
      const aboutSelf = message.trim();

      if (isTooLong(aboutSelf)) {
        return ctx.reply(language === 'uz' ? TEXT.tooLongUz : TEXT.tooLongRu, cancelKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'motivation',
        aboutSelf,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterMotivationUz : TEXT.enterMotivationRu, cancelKeyboard(language));
    }

    if (ctx.session.application?.step === 'motivation') {
      const motivation = message.trim();

      if (isTooLong(motivation)) {
        return ctx.reply(language === 'uz' ? TEXT.tooLongUz : TEXT.tooLongRu, cancelKeyboard(language));
      }

      ctx.session.application = {
        ...ctx.session.application,
        step: 'passportFile',
        motivation,
      };

      return ctx.reply(language === 'uz' ? TEXT.enterPassportUz : TEXT.enterPassportRu, cancelKeyboard(language));
    }

    const contentKey = contentKeyByButton(message, language);

    if (contentKey) {
      const text = await getContent(contentKey, language);
      return ctx.reply(text, mainKeyboard(language, userIsAdmin));
    }

    return showMainMenu(ctx, language);
  });
}
