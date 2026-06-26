import { Markup } from 'telegraf';
import { BUTTONS, COURSES, FASHION_DIRECTIONS, REGION_DISTRICTS } from '../constants.js';

export function languageKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🇺🇿 O'zbek tili", 'lang:uz'),
      Markup.button.callback('🇷🇺 Русский язык', 'lang:ru'),
    ],
  ]);
}

export function mainKeyboard(language, isUserAdmin = false) {
  const buttons = BUTTONS[language];
  const rows = [
    [buttons.language],
    [buttons.apply],
    [buttons.about, buttons.rules],
    [buttons.faq],
    [buttons.contact],
  ];

  if (isUserAdmin) {
    rows.push([buttons.adminPanel]);
  }

  return Markup.keyboard(rows).resize();
}

export function regionKeyboard(language) {
  const regions = Object.keys(REGION_DISTRICTS);
  const rows = [];

  for (let index = 0; index < regions.length; index += 2) {
    rows.push(regions.slice(index, index + 2));
  }

  rows.push([BUTTONS[language].cancel]);
  return Markup.keyboard(rows).resize();
}

export function districtKeyboard(language, region) {
  const districts = REGION_DISTRICTS[region] || [];
  const rows = [];

  for (let index = 0; index < districts.length; index += 2) {
    rows.push(districts.slice(index, index + 2));
  }

  rows.push([BUTTONS[language].cancel]);
  return Markup.keyboard(rows).resize();
}

export function submitApplicationKeyboard(language) {
  return Markup.keyboard([
    [BUTTONS[language].confirm, BUTTONS[language].edit],
    [BUTTONS[language].cancel],
  ]).resize();
}

export function phoneKeyboard(language) {
  return Markup.keyboard([
    [Markup.button.contactRequest(BUTTONS[language].sendPhone)],
    [BUTTONS[language].cancel],
  ]).resize();
}

export function genderKeyboard(language) {
  return Markup.keyboard([
    [BUTTONS[language].male, BUTTONS[language].female],
    [BUTTONS[language].cancel],
  ]).resize();
}

export function yesNoKeyboard(language) {
  return Markup.keyboard([
    [BUTTONS[language].yes, BUTTONS[language].no],
    [BUTTONS[language].cancel],
  ]).resize();
}

export function optionalKeyboard(language) {
  return Markup.keyboard([
    [BUTTONS[language].skip],
    [BUTTONS[language].cancel],
  ]).resize();
}

export function cancelKeyboard(language) {
  return Markup.keyboard([[BUTTONS[language].cancel]]).resize();
}

export function fashionDirectionKeyboard(language) {
  const rows = FASHION_DIRECTIONS.map((direction) => [direction]);
  rows.push([BUTTONS[language].cancel]);
  return Markup.keyboard(rows).resize();
}

export function courseKeyboard(language) {
  return Markup.keyboard([
    COURSES.slice(0, 3),
    COURSES.slice(3, 6),
    [BUTTONS[language].cancel],
  ]).resize();
}

export function adminPanelKeyboard(language) {
  const buttons = BUTTONS[language];

  return Markup.keyboard([
    [buttons.adminSetGroup, buttons.adminEditMessages],
    [buttons.adminExportExcel],
    [buttons.adminBroadcast],
    [buttons.adminManageGroups],
    [buttons.adminManageAdmins],
    [buttons.adminToggleApplications],
    [buttons.back],
  ]).resize();
}

export function adminContentKeyboard(language) {
  const buttons = BUTTONS[language];

  return Markup.keyboard([
    [buttons.adminEditStart],
    [buttons.adminEditAbout],
    [buttons.adminEditRules],
    [buttons.adminEditFaq],
    [buttons.adminEditContact],
    [buttons.back],
  ]).resize();
}

export function adminLanguageKeyboard(language) {
  return Markup.keyboard([
    ["🇺🇿 O'zbek tili", '🇷🇺 Русский язык'],
    [BUTTONS[language].back],
  ]).resize();
}

export function adminGroupsKeyboard(language, groups = []) {
  const buttons = BUTTONS[language];
  const rows = groups.map((g) => [`🗑️ ${g.name}`]);
  rows.push([buttons.back]);
  return Markup.keyboard(rows).resize();
}

export function adminAdminsKeyboard(language) {
  const buttons = BUTTONS[language];
  return Markup.keyboard([
    ['➕ Admin qo\'shish', '➖ Admin o\'chirish'],
    ['📋 Admin ruyxati'],
    [buttons.back],
  ]).resize();
}

export function adminAdminListKeyboard(language, admins = [], rootAdmin = null) {
  const buttons = BUTTONS[language];
  const rows = admins.map((id) => {
    const badge = id === rootAdmin ? '👑' : '🔧';
    return [`🗑️ ${badge} ${id}`];
  });
  rows.push([buttons.back]);
  return Markup.keyboard(rows).resize();
}

export function confirmKeyboard(language) {
  const buttons = BUTTONS[language];
  return Markup.keyboard([
    [buttons.yes, buttons.no],
    [buttons.cancel],
  ]).resize();
}
