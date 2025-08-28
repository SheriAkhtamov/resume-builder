require('dotenv').config(); // Загружает переменные из .env файла
const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const docx = require('docx');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// Безопасно получаем ключ из .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { 
    Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, 
    AlignmentType, Table, TableRow, TableCell, WidthType, 
    BorderStyle, convertInchesToTwip 
} = docx;

const app = express();
// Используем порт из переменной окружения или 3000 по умолчанию
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(express.static('public'));

// ЭНДПОИНТ: ПАРСИНГ РЕЗЮМЕ С ПОМОЩЬЮ AI
app.post('/parse-resume', upload.single('resumeFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Файл не загружен.');
    }

    try {
        const filePath = req.file.path;
        let resumeText = '';

        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            resumeText = data.text;
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: filePath });
            resumeText = result.value;
        } else if (req.file.mimetype === 'text/plain') {
            resumeText = fs.readFileSync(filePath, 'utf8');
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).send('Неподдерживаемый формат файла. Используйте PDF, DOCX или TXT.');
        }

        fs.unlinkSync(filePath);

        const prompt = `
            Ты — эксперт-рекрутер, который анализирует текст резюме и извлекает информацию в строгом JSON формате.
            Твоя задача — проанализировать текст резюме и заполнить JSON-объект.
            Ключи в JSON должны быть следующими: "fullName", "jobTitle", "phone", "email", "birthDate", "citizenship", "maritalStatus", "workExperience", "educationLevel", "educationInstitutions", "courses", "languages", "skills".
            - Для 'workExperience' сохрани оригинальное форматирование, но раздели разные места работы двумя переносами строки (\\n\\n).
            - Для 'skills' и 'languages' перечисли каждый навык или язык с новой строки (\\n).
            - Если какая-то информация отсутствует, оставь поле пустым ("").
            - НЕ ИЗВЛЕКАЙ ИНФОРМАЦИЮ О ФОТО.
            - Твой ответ должен быть ИСКЛЮЧИТЕЛЬНО JSON-объектом, без лишнего текста и без \`\`\`json.

            Текст резюме:
            """
            ${resumeText}
            """
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const parsedData = JSON.parse(response.choices[0].message.content);
        res.json(parsedData);

    } catch (error) {
        console.error('AI Parsing Error:', error);
        res.status(500).send('Ошибка при обработке резюме с помощью AI.');
    }
});

// ЭНДПОИНТ: ГЕНЕРАЦИЯ PDF
app.post('/generate/pdf', upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        const photoPath = req.file ? req.file.path : null;
        const htmlContent = generateModernHtml(data, photoPath);

        const browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

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

// ЭНДПОИНТ: ГЕНЕРАЦИЯ DOCX
app.post('/generate/docx', upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        const photoPath = req.file ? req.file.path : null;
        const doc = generateModernDocx(data, photoPath);
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
function generateModernHtml(data, photoPath) {
    let photoHtml = '';
    if (photoPath) {
        const photoData = fs.readFileSync(photoPath).toString('base64');
        photoHtml = `<img class="photo" src="data:image/jpeg;base64,${photoData}" alt="Фото">`;
    }

    const formatToList = (text) => (text || '').split('\n').filter(line => line.trim() !== '').map(line => `<li>${line.trim()}</li>`).join('');
    
    const phoneIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-telephone-fill" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.28 1.465l-2.135 2.136a11.942 11.942 0 0 0 6.014 6.014l2.136-2.135a1.745 1.745 0 0 1 1.465.28l1.77 1.77a1.745 1.745 0 0 1 .163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.031.003-2.137.703-2.877L1.885.511z"/></svg>`;
    const emailIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope-fill" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg>`;

    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
            :root { --bg-color: #FFFFFF; --sidebar-bg: #F8F9FA; --text-color: #212529; --subtle-text: #6C757D; --accent-color: #0D6EFD; --border-color: #DEE2E6; }
            html, body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; font-size: 10pt; line-height: 1.6; background-color: #EEE; color: var(--text-color); }
            .page { background-color: var(--bg-color); width: 210mm; height: 297mm; box-sizing: border-box; margin: 0 auto; display: flex; }
            .sidebar { width: 70mm; background-color: var(--sidebar-bg); padding: 10mm; box-sizing: border-box; }
            .main-content { width: 140mm; padding: 10mm; box-sizing: border-box; }
            .photo { width: 40mm; height: 40mm; border-radius: 50%; object-fit: cover; margin: 0 auto 8mm auto; display: block; border: 3px solid var(--border-color); }
            h1 { font-size: 28pt; font-weight: 700; color: var(--accent-color); margin: 0 0 5px 0; line-height: 1.2; }
            h2 { font-size: 14pt; font-weight: 500; margin: 0 0 10mm 0; border-bottom: 1px solid var(--border-color); padding-bottom: 5mm; }
            .section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-color); margin: 8mm 0 4mm 0; padding-bottom: 2mm; border-bottom: 1px solid var(--border-color); }
            .contact-item { display: flex; align-items: center; margin-bottom: 3mm; }
            .contact-item svg { margin-right: 3mm; fill: var(--subtle-text); flex-shrink: 0; }
            ul { list-style: none; padding: 0; margin: 0; }
            ul li { padding-left: 5mm; position: relative; margin-bottom: 2mm; }
            ul li::before { content: '▪'; position: absolute; left: 0; color: var(--accent-color); }
            .job { margin-bottom: 8mm; }
            .job-title { font-size: 12pt; font-weight: 700; margin: 0; }
            .company-date { color: var(--subtle-text); font-style: italic; margin: 0 0 3mm 0; }
        </style>
    </head>
    <body>
        <div class="page">
            <aside class="sidebar">
                ${photoHtml}
                <h3 class="section-title">Контакты</h3>
                <div class="contact-item">${phoneIcon} <span>${data.phone || ''}</span></div>
                <div class="contact-item">${emailIcon} <span>${data.email || ''}</span></div>
                <h3 class="section-title">Навыки</h3>
                <ul>${formatToList(data.skills)}</ul>
                <h3 class="section-title">Языки</h3>
                <ul>${formatToList(data.languages)}</ul>
            </aside>
            <main class="main-content">
                <h1>${data.fullName || ''}</h1>
                <h2>${data.jobTitle || ''}</h2>
                <h3 class="section-title">Опыт работы</h3>
                <div class="experience">${(data.workExperience || '').replace(/\n/g, '<br>')}</div>
                <h3 class="section-title">Образование</h3>
                <div class="education">
                    <p class="job-title">${data.educationLevel || ''}</p>
                    <p>${(data.educationInstitutions || '').replace(/\n/g, '<br>')}</p>
                </div>
                ${data.courses ? `<h3 class="section-title">Курсы</h3><div class="courses"><p>${(data.courses || '').replace(/\n/g, '<br>')}</p></div>` : ''}
            </main>
        </div>
    </body>
    </html>`;
}

// ФУНКЦИЯ: ГЕНЕРАЦИЯ DOCX
function generateModernDocx(data, photoPath) {
    const FONT = "Inter";
    const createSectionHeader = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, allCaps: true, size: 24, font: FONT, color: "0D6EFD" })], spacing: { before: 400, after: 200 }, border: { bottom: { color: "DEE2E6", size: 6, value: "single" } } });
    const createJobTitle = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 24, font: FONT })] });
    const createCompanyDate = (text) => new Paragraph({ children: [new TextRun({ text, italics: true, size: 20, font: FONT, color: "6C757D" })], spacing: { after: 100 } });
    const createBullet = (text) => new Paragraph({ text, bullet: { level: 0 }, style: "Normal", indent: { left: convertInchesToTwip(0.25) } });

    const leftChildren = [];
    if (photoPath) { leftChildren.push(new Paragraph({ children: [new ImageRun({ data: fs.readFileSync(photoPath), transformation: { width: 150, height: 150 } })], alignment: AlignmentType.CENTER })); }
    leftChildren.push(createSectionHeader("Контакты")); leftChildren.push(new Paragraph(`Телефон: ${data.phone || ''}`)); leftChildren.push(new Paragraph(`Email: ${data.email || ''}`));
    leftChildren.push(createSectionHeader("Навыки")); (data.skills || '').split('\n').filter(s => s.trim()).forEach(skill => leftChildren.push(createBullet(skill)));
    leftChildren.push(createSectionHeader("Языки")); (data.languages || '').split('\n').filter(l => l.trim()).forEach(lang => leftChildren.push(createBullet(lang)));

    const rightChildren = [];
    rightChildren.push(createSectionHeader("Опыт работы"));
    (data.workExperience || '').split('\n\n').forEach(block => {
        const lines = block.split('\n'); rightChildren.push(createJobTitle(lines[0] || '')); rightChildren.push(createCompanyDate(lines[1] || '')); lines.slice(2).forEach(line => rightChildren.push(createBullet(line)));
    });
    rightChildren.push(createSectionHeader("Образование")); rightChildren.push(createJobTitle(data.educationLevel || '')); rightChildren.push(new Paragraph(data.educationInstitutions || ''));
    if(data.courses) { rightChildren.push(createSectionHeader("Курсы")); rightChildren.push(new Paragraph(data.courses)); }
    
    const doc = new Document({
        styles: { paragraphStyles: [{ id: "Normal", name: "Normal", run: { font: FONT, size: 20, color: "212529" }, paragraph: { spacing: { after: 120, line: 320 } } }] },
        sections: [{ children: [ new Paragraph({ children: [new TextRun({ text: data.fullName || '', bold: true, size: 56, font: FONT, color: "0D6EFD" })], alignment: AlignmentType.LEFT }), new Paragraph({ children: [new TextRun({ text: data.jobTitle || '', size: 28, font: FONT, color: "212529" })], alignment: AlignmentType.LEFT, spacing: { after: 300 }, border: { bottom: { color: "DEE2E6", size: 6, value: "single" } } }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [35, 65], borders: BorderStyle.NONE, rows: [ new TableRow({ children: [ new TableCell({ children: leftChildren, margins: { right: 200 } }), new TableCell({ children: rightChildren, margins: { left: 200 } }), ], }), ], }), ] }]
    });
    return doc;
}