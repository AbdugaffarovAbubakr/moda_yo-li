import XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { readJsonFile } from './jsonStore.js';

export async function exportApplicationsToExcel() {
  const applications = await readJsonFile('applications', []);
  
  if (applications.length === 0) {
    return null;
  }

  const headers = [
    'ID',
    'Telegram ID',
    'Username',
    'Ism',
    'Familiya',
    'Til',
    'Hudud',
    'Tuman',
    'FIO',
    'Tug\'ilgan sana',
    'Jins',
    'Talaba',
    'Unversitet',
    'Mutahasisligi',
    'Kurs',
    'Telefon',
    'Telegram Username',
    'Elektron Pochta',
    'Moda Qiziqishi',
    'Yo\'nalish',
    'Tajriba',
    'O\'zi Haqida',
    'Motivatsiya',
    'Tayyor Ishlar',
    'Fayllar Soni',
    'Saqlandi',
  ];

  const data = applications.map(app => [
    app.id || '',
    app.telegramId || '',
    app.username || '',
    app.firstName || '',
    app.lastName || '',
    app.language || '',
    app.region || '',
    app.district || '',
    app.fullName || '',
    app.birthDate || '',
    app.gender === 'male' ? 'Erkak' : 'Ayol',
    app.isStudent ? 'Ha' : "Yo'q",
    app.educationInstitution || '',
    app.specialty || '',
    app.course || '',
    app.phone || '',
    app.telegramUsername || '',
    app.email || '',
    app.interestedInFashion ? 'Ha' : "Yo'q",
    app.fashionDirection || '',
    app.hasExperience ? 'Ha' : "Yo'q",
    app.aboutSelf || '',
    app.motivation || '',
    app.hasReadyWorks ? 'Ha' : "Yo'q",
    app.workFiles?.length || 0,
    app.savedAt || '',
  ]);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Set column widths
  const colWidths = headers.map(() => 20);
  worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Arizalar');
  
  const exportDir = path.resolve('data', 'exports');
  await fs.mkdir(exportDir, { recursive: true });

  const fileName = `arizalar_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(exportDir, fileName);
  XLSX.writeFile(workbook, filePath);
  
  return filePath;
}
