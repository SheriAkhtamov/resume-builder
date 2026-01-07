const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// СЛОВАРЬ ПЕРЕВОДОВ НА СЕРВЕРЕ
const translations = {
    ru: { sectionContacts: 'Контакты', sectionSkills: 'Навыки', sectionLanguages: 'Языки', sectionPersonalInfo: 'Личная информация', labelBirthDate: 'Дата рождения:', labelLocation: 'Город:', labelMaritalStatus: 'Семейное положение:', sectionExperience: 'Опыт работы', sectionEducation: 'Образование', sectionCourses: 'Курсы', phone: 'Телефон', email: 'Email', eduHigher: 'Высшее', eduIncomplete: 'Неоконченное высшее', eduVocational: 'Среднее специальное', eduSecondary: 'Среднее', maritalSingle: 'Не женат / Не замужем', maritalMarried: 'Женат / Замужем' },
    uz: { sectionContacts: 'Aloqa', sectionSkills: 'Ko\'nikmalar', sectionLanguages: 'Tillar', sectionPersonalInfo: 'Shaxsiy ma\'lumotlar', labelBirthDate: 'Tug\'ilgan sana:', labelLocation: 'Shahar:', labelMaritalStatus: 'Oilaviy holati:', sectionExperience: 'Ish tajribasi', sectionEducation: 'Ta\'lim', sectionCourses: 'Kurslar', phone: 'Telefon', email: 'Email', eduHigher: 'Oliy', eduIncomplete: 'Tugallanmagan oliy', eduVocational: 'O\'rta maxsus', eduSecondary: 'O\'rta', maritalSingle: 'Uylanmagan / Turmushga chiqmagan', maritalMarried: 'Uylangan / Turmushga chiqqan' }
};
const educationKeys = { higher: 'eduHigher', incomplete: 'eduIncomplete', vocational: 'eduVocational', secondary: 'eduSecondary'};
const maritalStatusKeys = { single: 'maritalSingle', married: 'maritalMarried' };

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
// ЭНДПОИНТ: ГЕНЕРАЦИЯ PDF
app.post('/generate/pdf', upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        const lang = data.lang || 'ru'; // Получаем язык
        const t = translations[lang]; // Выбираем нужный словарь
        
        const photoPath = req.file ? req.file.path : null;
        const htmlContent = generateModernHtml(data, photoPath, t, lang); // Передаем словарь в функцию

        const browser = await puppeteer.launch({ 
            executablePath: '/usr/bin/chromium-browser', // <--- ВОТ ЭТО ИСПРАВЛЕНИЕ
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });

        await browser.close();
        if (photoPath) fs.unlinkSync(photoPath);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).send('Ошибка при генерации PDF');
    }
});

// ЭНДПОИНТ: ГЕНЕРАЦИЯ PNG
app.post('/generate/png', upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        const lang = data.lang || 'ru'; // Получаем язык
        const t = translations[lang]; // Выбираем нужный словарь
        
        const photoPath = req.file ? req.file.path : null;
        const htmlContent = generateModernHtml(data, photoPath, t, lang); // Передаем словарь в функцию

        const browser = await puppeteer.launch({ 
            executablePath: '/usr/bin/chromium-browser', // <--- И ЗДЕСЬ ТОЖЕ
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Скриншот всей страницы в формате PNG
        const pngBuffer = await page.screenshot({ 
            type: 'png',
            fullPage: true
        });

        await browser.close();
        if (photoPath) fs.unlinkSync(photoPath);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.png');
        res.send(pngBuffer);

    } catch (error) {
        console.error('PNG Generation Error:', error);
        res.status(500).send('Ошибка при генерации PNG');
    }
});

// ЭНДПОИНТ: ГЕНЕРАЦИЯ DOCX
app.post('/generate/docx', upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        const lang = data.lang || 'ru'; // Получаем язык
        const t = translations[lang]; // Выбираем нужный словарь

        const photoPath = req.file ? req.file.path : null;
        const doc = generateModernDocx(data, photoPath, t); // Передаем словарь в функцию
        const docxBuffer = await Packer.toBuffer(doc);

        if (photoPath) fs.unlinkSync(photoPath);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.docx');
        res.send(docxBuffer);

    } catch (error) {
        console.error('DOCX Generation Error:', error);
        res.status(500).send('Ошибка при генерации DOCX');
    }
});

app.listen(port, () => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    console.log(`Сервер запущен на http://localhost:${port}`);
});

// ФУНКЦИЯ: ГЕНЕРАЦИЯ HTML ДЛЯ PDF
function generateModernHtml(data, photoPath, t, lang) { // Добавили t
    let photoHtml = '';
    const initials = (data.fullName || '')
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'CV';
    if (photoPath) {
        const photoData = fs.readFileSync(photoPath).toString('base64');
        photoHtml = `<img class="photo" src="data:image/jpeg;base64,${photoData}" alt="Фото">`;
    } else {
        photoHtml = `<div class="photo placeholder">${initials}</div>`;
    }

    const formatToList = (text) => (text || '')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<li><span>${line.trim()}</span></li>`)
        .join('');

    const formatParagraphs = (text) => (text || '')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<p class="paragraph">${line.trim()}</p>`)
        .join('');

    const formatExperience = (text) => {
        if (!text) return '';
        return text.split('\n\n').map(block => {
            const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
            if (!lines.length) return '';
            if (lines.length === 1) {
                return `<p class="experience-text">${lines[0]}</p>`;
            }
            const title = lines[0];
            const meta = lines[1] || '';
            const details = lines.slice(2);
            const detailsHtml = details.length
                ? `<ul class="bullet-list">${details.map(item => `<li>${item}</li>`).join('')}</ul>`
                : '';
            return `
                <div class="experience-item">
                    <div class="experience-header">
                        <h4>${title}</h4>
                        ${meta ? `<span>${meta}</span>` : ''}
                    </div>
                    ${detailsHtml}
                </div>
            `;
        }).join('');
    };
    
    const phoneIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-telephone-fill" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.28 1.465l-2.135 2.136a11.942 11.942 0 0 0 6.014 6.014l2.136-2.135a1.745 1.745 0 0 1 1.465.28l1.77 1.77a1.745 1.745 0 0 1 .163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.031.003-2.137.703-2.877L1.885.511z"/></svg>`;
    const emailIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope-fill" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg>`;

    let personalInfoHtml = '';
    if (data.birthDate || data.location || data.maritalStatus) {
        const maritalStatusKey = maritalStatusKeys[data.maritalStatus];
        personalInfoHtml += `<div class="card"><h3 class="section-title">${t.sectionPersonalInfo}</h3>`;
        if (data.birthDate) personalInfoHtml += `<div class="personal-item"><span>${t.labelBirthDate}</span><strong>${data.birthDate}</strong></div>`;
        if (data.location) personalInfoHtml += `<div class="personal-item"><span>${t.labelLocation}</span><strong>${data.location}</strong></div>`;
        if (maritalStatusKey) personalInfoHtml += `<div class="personal-item"><span>${t.labelMaritalStatus}</span><strong>${t[maritalStatusKey]}</strong></div>`;
        personalInfoHtml += `</div>`;
    }

    const educationLevelKey = educationKeys[data.educationLevel];
    const educationLevelText = educationLevelKey ? t[educationLevelKey] : '';
    const contacts = [data.phone ? `${phoneIcon}<span>${data.phone}</span>` : '', data.email ? `${emailIcon}<span>${data.email}</span>` : '']
        .filter(Boolean)
        .map(item => `<div class="contact-pill">${item}</div>`)
        .join('');

    return `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root { --page-bg: #F5F6FA; --card-bg: #FFFFFF; --text-color: #101828; --muted-text: #667085; --accent-color: #4F46E5; --accent-soft: #EEF2FF; --border-color: #E4E7EC; }
            html, body { margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10pt; line-height: 1.6; background-color: #E2E8F0; color: var(--text-color); }
            .page { background-color: var(--page-bg); width: 210mm; height: 297mm; box-sizing: border-box; margin: 0 auto; padding: 12mm; }
            .hero { background: linear-gradient(135deg, #111827 0%, #4338CA 55%, #6366F1 100%); color: #FFFFFF; border-radius: 16px; padding: 10mm; display: flex; justify-content: space-between; align-items: center; gap: 8mm; }
            .hero-profile { display: flex; align-items: center; gap: 6mm; }
            .photo { width: 36mm; height: 36mm; border-radius: 50%; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 18pt; font-weight: 700; background: rgba(255, 255, 255, 0.2); border: 3px solid rgba(255, 255, 255, 0.4); }
            .photo.placeholder { color: #FFFFFF; letter-spacing: 0.08em; }
            .hero h1 { font-size: 26pt; font-weight: 700; margin: 0 0 2mm 0; line-height: 1.2; }
            .hero .role { margin: 0; font-size: 12pt; font-weight: 500; color: rgba(255, 255, 255, 0.85); }
            .hero-contacts { display: flex; flex-direction: column; gap: 3mm; align-items: flex-end; }
            .contact-pill { display: inline-flex; align-items: center; gap: 2mm; padding: 2.5mm 4mm; border-radius: 999px; background: rgba(255, 255, 255, 0.18); font-size: 9.5pt; }
            .contact-pill svg { width: 14px; height: 14px; }
            .content { display: grid; grid-template-columns: 72mm 1fr; gap: 8mm; margin-top: 8mm; }
            .card { background: var(--card-bg); border-radius: 14px; padding: 6mm; box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08); border: 1px solid var(--border-color); }
            .section-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-color); margin: 0 0 4mm 0; }
            .sidebar .card + .card { margin-top: 6mm; }
            .contact-item { display: flex; align-items: center; gap: 3mm; margin-bottom: 3mm; color: var(--muted-text); }
            .contact-item svg { fill: var(--accent-color); flex-shrink: 0; }
            .pill-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 2mm; }
            .pill-list li span { display: inline-flex; padding: 2mm 3.5mm; border-radius: 999px; background: var(--accent-soft); color: var(--accent-color); font-size: 9pt; font-weight: 600; }
            .personal-item { display: flex; justify-content: space-between; margin-bottom: 2.5mm; color: var(--muted-text); }
            .personal-item strong { color: var(--text-color); font-weight: 600; }
            .main-content .card + .card { margin-top: 6mm; }
            .experience-item { padding: 4mm; border-radius: 12px; background: #F8FAFC; border: 1px solid var(--border-color); margin-bottom: 4mm; }
            .experience-header { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; margin-bottom: 2mm; }
            .experience-header h4 { margin: 0; font-size: 11pt; font-weight: 700; }
            .experience-header span { font-size: 9.5pt; color: var(--muted-text); }
            .bullet-list { margin: 0; padding-left: 4mm; color: var(--muted-text); }
            .bullet-list li { margin-bottom: 1.5mm; }
            .paragraph { margin: 0 0 2mm 0; color: var(--muted-text); }
            .experience-text { margin: 0; color: var(--muted-text); }
        </style>
    </head>
    <body>
        <div class="page">
            <header class="hero">
                <div class="hero-profile">
                    ${photoHtml}
                    <div>
                        <h1>${data.fullName || ''}</h1>
                        <p class="role">${data.jobTitle || ''}</p>
                    </div>
                </div>
                <div class="hero-contacts">
                    ${contacts}
                </div>
            </header>
            <div class="content">
                <aside class="sidebar">
                    <div class="card">
                        <h3 class="section-title">${t.sectionContacts}</h3>
                        ${data.phone ? `<div class="contact-item">${phoneIcon} <span>${data.phone}</span></div>` : ''}
                        ${data.email ? `<div class="contact-item">${emailIcon} <span>${data.email}</span></div>` : ''}
                    </div>
                    <div class="card">
                        <h3 class="section-title">${t.sectionSkills}</h3>
                        <ul class="pill-list">${formatToList(data.skills)}</ul>
                    </div>
                    <div class="card">
                        <h3 class="section-title">${t.sectionLanguages}</h3>
                        <ul class="pill-list">${formatToList(data.languages)}</ul>
                    </div>
                    ${personalInfoHtml}
                </aside>
                <main class="main-content">
                    <div class="card">
                        <h3 class="section-title">${t.sectionExperience}</h3>
                        ${formatExperience(data.workExperience)}
                    </div>
                    <div class="card">
                        <h3 class="section-title">${t.sectionEducation}</h3>
                        <p class="paragraph"><strong>${educationLevelText}</strong></p>
                        ${formatParagraphs(data.educationInstitutions)}
                    </div>
                    ${data.courses ? `<div class="card"><h3 class="section-title">${t.sectionCourses}</h3>${formatParagraphs(data.courses)}</div>` : ''}
                </main>
            </div>
        </div>
    </body>
    </html>`;
}

// ФУНКЦИЯ: ГЕНЕРАЦИЯ DOCX
function generateModernDocx(data, photoPath, t) { // Добавили t
    const FONT = "Inter";
    const createSectionHeader = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, allCaps: true, size: 24, font: FONT, color: "0D6EFD" })], spacing: { before: 400, after: 200 }, border: { bottom: { color: "DEE2E6", size: 6, value: "single" } } });
    const createJobTitle = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 24, font: FONT })] });
    const createCompanyDate = (text) => new Paragraph({ children: [new TextRun({ text, italics: true, size: 20, font: FONT, color: "6C757D" })], spacing: { after: 100 } });
    const createBullet = (text) => new Paragraph({ text, bullet: { level: 0 }, style: "Normal", indent: { left: convertInchesToTwip(0.25) } });
    const createPersonalInfo = (label, value) => new Paragraph({ children: [ new TextRun({ text: label, bold: true }), new TextRun({ text: ` ${value}` }) ], style: "Normal" });

    const leftChildren = [];
    if (photoPath) { leftChildren.push(new Paragraph({ children: [new ImageRun({ data: fs.readFileSync(photoPath), transformation: { width: 150, height: 150 } })], alignment: AlignmentType.CENTER })); }
    leftChildren.push(createSectionHeader(t.sectionContacts)); leftChildren.push(new Paragraph(`${t.phone}: ${data.phone || ''}`)); leftChildren.push(new Paragraph(`${t.email}: ${data.email || ''}`));
    leftChildren.push(createSectionHeader(t.sectionSkills)); (data.skills || '').split('\n').filter(s => s.trim()).forEach(skill => leftChildren.push(createBullet(skill)));
    leftChildren.push(createSectionHeader(t.sectionLanguages)); (data.languages || '').split('\n').filter(l => l.trim()).forEach(lang => leftChildren.push(createBullet(lang)));
    
    if (data.birthDate || data.location || data.maritalStatus) {
        const maritalStatusKey = maritalStatusKeys[data.maritalStatus];
        leftChildren.push(createSectionHeader(t.sectionPersonalInfo));
        if (data.birthDate) leftChildren.push(createPersonalInfo(t.labelBirthDate, data.birthDate));
        if (data.location) leftChildren.push(createPersonalInfo(t.labelLocation, data.location));
        if (maritalStatusKey) leftChildren.push(createPersonalInfo(t.labelMaritalStatus, t[maritalStatusKey]));
    }

    const educationLevelKey = educationKeys[data.educationLevel];
    const educationLevelText = educationLevelKey ? t[educationLevelKey] : '';

    const rightChildren = [];
    rightChildren.push(createSectionHeader(t.sectionExperience));
    (data.workExperience || '').split('\n\n').forEach(block => {
        const lines = block.split('\n'); rightChildren.push(createJobTitle(lines[0] || '')); rightChildren.push(createCompanyDate(lines[1] || '')); lines.slice(2).forEach(line => rightChildren.push(createBullet(line)));
    });
    rightChildren.push(createSectionHeader(t.sectionEducation)); rightChildren.push(createJobTitle(educationLevelText)); rightChildren.push(new Paragraph(data.educationInstitutions || ''));
    if(data.courses) { rightChildren.push(createSectionHeader(t.sectionCourses)); rightChildren.push(new Paragraph(data.courses)); }
    
    const doc = new Document({
        styles: { paragraphStyles: [{ id: "Normal", name: "Normal", run: { font: FONT, size: 20, color: "212529" }, paragraph: { spacing: { after: 120, line: 320 } } }] },
        sections: [{ children: [ new Paragraph({ children: [new TextRun({ text: data.fullName || '', bold: true, size: 56, font: FONT, color: "0D6EFD" })], alignment: AlignmentType.LEFT }), new Paragraph({ children: [new TextRun({ text: data.jobTitle || '', size: 28, font: FONT, color: "212529" })], alignment: AlignmentType.LEFT, spacing: { after: 300 }, border: { bottom: { color: "DEE2E6", size: 6, value: "single" } } }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [35, 65], borders: BorderStyle.NONE, rows: [ new TableRow({ children: [ new TableCell({ children: leftChildren, margins: { right: 200 } }), new TableCell({ children: rightChildren, margins: { left: 200 } }), ], }), ], }), ] }]
    });
    return doc;
}
