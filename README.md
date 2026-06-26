# Telegram Contest Bot

Node.js, Telegraf va JSON fayllarda saqlanadigan ikki tilli Telegram bot.

## Imkoniyatlar

- Foydalanuvchi birinchi kirishda til tanlaydi: O'zbek yoki Rus.
- `/start` bosilganda admin tahrirlay oladigan xabar va asosiy menyu chiqadi.
- Menyu bo'limlari: tilni sozlash, ariza topshirish, tanlov haqida, nizom, FAQ, bog'lanish.
- Admin har bir bo'lim matnini bot ichidan yangilaydi va JSON fayllarga saqlaydi.
- Yangi foydalanuvchi va yangi ariza ma'lumotlari ulangan Telegram guruhga yuboriladi.
- Ariza topshirishda hudud tugmalar orqali tanlanadi.

## O'rnatish

```bash
npm install
```

`.env.example` faylidan `.env` yarating va qiymatlarni to'ldiring:

```env
BOT_TOKEN=123456:telegram_bot_token
ROOT_ADMIN=123456789
```

Foydalanuvchi ma'lumotlari bot papkasidagi JSON fayllarga saqlanadi. Guruh username admin tomonidan bot ichida ulanadi. Bot guruhga qo'shilgan bo'lishi va guruh public username'ga ega bo'lishi kerak.

## Ishga tushirish

```bash
npm start
```

Development rejimi:

```bash
npm run dev
```

## Admin Buyruqlari

Admin `/start` bosganda asosiy menyuda `Admin panel` tugmasi chiqadi. Shu tugma orqali mavjud admin amallarini ko'radi.

Admin panel tugmalari:

```text
Guruh ulash
Guruhlarni boshqarish
Arizalarni Excel qilib yuklash
Habar yuborish
Arizalarni ochish/yopish
Adminlarni boshqarish
Start xabarini tahrirlash
Tanlov haqida tahrirlash
Nizomni tahrirlash
FAQ tahrirlash
Bog'lanishni tahrirlash
```

`Guruh ulash` yoki `Guruhlarni boshqarish` bosilganda mavjud guruhlar ro'yxati chiqadi. Admin yangi `@guruh_username` yuborib guruh qo'shadi yoki ro'yxatdan guruhni tanlab o'chiradi. `ROOT_ADMIN` `.env`dagi asosiy admin hisoblanadi; qo'shimcha adminlar bot ichidan qo'shiladi yoki o'chiriladi, ammo ROOT admin o'chirilmaydi.

Qo'shimcha ravishda Telegram ichida eski buyruqlar ham ishlaydi:

```text
/admin
/setgroup @guruh_username
/set uz start Assalomu alaykum! Botga xush kelibsiz.
/set ru start Здравствуйте! Добро пожаловать.
/set uz about Tanlov haqida matn
/set uz rules Tanlov nizomi matni
/set uz faq FAQ matni
/set uz contact Bog'lanish ma'lumotlari
```

Mavjud kontent kalitlari:

```text
start, about, rules, faq, contact
```

Rus tili uchun `uz` o'rniga `ru` yoziladi.

## Ariza Formasi

Ariza topshirish ketma-ketligi:

```text
Hudud tanlash
Tuman/shahar tanlash
FIO kiritish
Tug'ilgan sana kiritish
Jins tanlash
Talaba ekanini tanlash
Ha bo'lsa o'quv muassasasi, mutaxassisligi va kursini kiritish
Telefon raqam kiritish
Telegram username kiritish yoki o'tkazib yuborish
Elektron pochta kiritish yoki o'tkazib yuborish
Moda yoki ijod yo'nalishiga qiziqishni tanlash
Ha bo'lsa moda yo'nalishini tanlash
Tajriba bor/yo'qligini tanlash
O'zi haqida qisqacha ma'lumot yozish
Tanlovda qatnashish sababini yozish
Pasport yoki ID karta suratini yuborish
3x4 rasmini yuborish
Tayyor ishlaringiz bormi? (Ha/Yo'q)
Agar ha bo'lsa, ish fotosuratlarini yuborish (1-2 ta)
Agar yo'q bo'lsa, ijodiy ishni yuborish (1-2 ta)
Ariza yuborish
```

`O'zi haqida` va `qatnashish sababi` maydonlari 500 belgigacha qabul qilinadi. Ariza yuborilganda foydalanuvchi to'ldirgan ma'lumotlar JSON faylga saqlanadi, fayllar esa admin guruhiga ariza matni bilan birga yuboriladi.
