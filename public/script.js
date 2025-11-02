document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resume-form');
    const pdfButton = document.getElementById('generate-pdf');
    const pngButton = document.getElementById('generate-png');
    const loader = document.getElementById('loader');

    // --- ЛОГИКА СОВРЕМЕННОГО ЗАГРУЗЧИКА ФОТО ---
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const photoInput = document.getElementById('photo-input');
    const imagePreview = document.getElementById('image-preview');
    const imagePlaceholder = document.getElementById('image-placeholder');
    const cropModal = document.getElementById('crop-modal');
    const cropperContainer = document.getElementById('cropper-container');
    const saveCropBtn = document.getElementById('save-crop-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    
    let croppieInstance = null;
    let croppedImageBlob = null; // Здесь будем хранить обрезанное фото для отправки

    // Клик по области превью открывает выбор файла
    imagePreviewContainer.addEventListener('click', () => photoInput.click());

    // Когда пользователь выбрал файл
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            cropModal.classList.remove('modal-hidden');
            // Уничтожаем старый экземпляр, если он был
            if (croppieInstance) {
                croppieInstance.destroy();
            }
            // Создаем новый Croppie
            croppieInstance = new Croppie(cropperContainer, {
                viewport: { width: 200, height: 200, type: 'circle' },
                boundary: { width: 300, height: 300 },
                enableExif: true
            });
            croppieInstance.bind({ url: event.target.result });
        };
        reader.readAsDataURL(file);
        photoInput.value = ''; // Сбрасываем инпут, чтобы можно было выбрать тот же файл снова
    });

    // Кнопка "Сохранить" в модальном окне
    saveCropBtn.addEventListener('click', () => {
        croppieInstance.result({
            type: 'blob', // Получаем результат как Blob-объект (эффективнее для отправки)
            size: { width: 400, height: 400 },
            format: 'png',
            quality: 0.9,
            circle: false
        }).then(blob => {
            croppedImageBlob = blob;
            const url = URL.createObjectURL(blob);
            imagePreview.src = url;
            imagePreview.classList.remove('hidden');
            imagePlaceholder.classList.add('hidden');
            cropModal.classList.add('modal-hidden');
        });
    });

    // Кнопка "Отмена"
    cancelCropBtn.addEventListener('click', () => {
        cropModal.classList.add('modal-hidden');
    });

    // --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЯЗЫКА ---
    const translations = {
        ru: { mainTitle: 'Конструктор Резюме', subTitle: 'Заполните поля ниже, чтобы создать профессиональное резюме', sectionBasicInfo: 'Основная информация', labelFullName: 'Ф.И.О.', labelJobTitle: 'Желаемая должность', labelPhoto: 'Ваше фото', uploadPhotoText: 'Нажмите, чтобы загрузить', cropModalTitle: 'Настройте ваше фото', btnCancel: 'Отмена', btnSave: 'Сохранить', sectionPersonalInfo: 'Личная информация', labelBirthDate: 'Дата рождения', labelLocation: 'Город проживания', labelMaritalStatus: 'Семейное положение', maritalSingle: 'Не женат / Не замужем', maritalMarried: 'Женат / Замужем', sectionContacts: 'Контакты', labelPhone: 'Номер телефона', labelEmail: 'E-mail', sectionExperience: 'Опыт работы', placeholderExperience: "Ведущий UI/UX Дизайнер...", sectionEducation: 'Образование', labelEducationLevel: 'Уровень образования', eduHigher: 'Высшее', eduIncomplete: 'Неоконченное высшее', eduVocational: 'Среднее специальное', eduSecondary: 'Среднее', labelEducationInstitutions: 'Учебные заведения', sectionCourses: 'Дополнительные курсы (необязательно)', sectionLanguages: 'Знание языков', placeholderLanguages: "Русский - Родной...", sectionSkills: 'Личные навыки', placeholderSkills: "Figma...", btnPdf: 'Скачать в .PDF', btnPng: 'Скачать в .PNG', loaderText: 'Генерируем ваше резюме...', developedBy: 'Разработан Шери.', officialPage: 'Официальная страница' },
        uz: { mainTitle: "Rezyume Konstruktori", subTitle: "Professional rezyume yaratish uchun quyidagi maydonlarni to'ldiring", sectionBasicInfo: "Asosiy ma'lumot", labelFullName: "F.I.Sh.", labelJobTitle: "Maqsadli lavozim", labelPhoto: "Sizning rasmingiz", uploadPhotoText: 'Yuklash uchun bosing', cropModalTitle: 'Rasmni sozlang', btnCancel: 'Bekor qilish', btnSave: 'Saqlash', sectionPersonalInfo: "Shaxsiy ma'lumotlar", labelBirthDate: "Tug'ilgan sana", labelLocation: "Yashash shahri", labelMaritalStatus: "Oilaviy holati", maritalSingle: "Uylanmagan / Turmushga chiqmagan", maritalMarried: "Uylangan / Turmushga chiqqan", sectionContacts: "Aloqa", labelPhone: "Telefon raqami", labelEmail: "E-mail", sectionExperience: "Ish tajribasi", placeholderExperience: "Yetakchi UI/UX Dizayner...", sectionEducation: "Ta'lim", labelEducationLevel: "Ta'lim darajasi", eduHigher: "Oliy", eduIncomplete: "Tugallanmagan oliy", eduVocational: "O'rta maxsus", eduSecondary: "O'rta", labelEducationInstitutions: "O'quv muassasalari", sectionCourses: "Qo'shimcha kurslar (ixtiyoriy)", sectionLanguages: "Til bilish darajasi", placeholderLanguages: "O'zbek tili - Ona tili...", sectionSkills: "Shaxsiy ko'nikmalar", placeholderSkills: "Figma...", btnPdf: ".PDF formatida yuklab olish", btnPng: ".PNG formatida yuklab olish", loaderText: "Rezyumeingiz yaratilmoqda...", developedBy: 'Sheri tomonidan ishlab chiqilgan.', officialPage: 'Rasmiy sahifa' }
    };
    const langButtons = document.querySelectorAll('.lang-btn');
    const translatableElements = document.querySelectorAll('[data-lang-key]');
    const setLanguage = (lang) => { translatableElements.forEach(el => { const key = el.getAttribute('data-lang-key'); if (translations[lang][key]) { if (el.placeholder) { el.placeholder = translations[lang][key]; } else { el.textContent = translations[lang][key]; } } }); document.documentElement.lang = lang; langButtons.forEach(btn => { btn.classList.toggle('active', btn.dataset.lang === lang); }); };
    langButtons.forEach(button => { button.addEventListener('click', () => setLanguage(button.dataset.lang)); });

    // --- ЛОГИКА ГЕНЕРАЦИИ РЕЗЮМЕ (с обновлением для фото) ---
    const generateResume = async (format) => {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        loader.classList.remove('loader-hidden');

        const formData = new FormData(form);
        formData.delete('photo-input'); 
        
        // ----> ВОТ ВАЖНОЕ ИЗМЕНЕНИЕ <----
        const currentLang = document.querySelector('.lang-btn.active').dataset.lang || 'ru';
        formData.append('lang', currentLang);
        
        if (croppedImageBlob) {
            formData.append('photo', croppedImageBlob, 'resume_photo.png');
        }
        
        try {
            const response = await fetch(`/generate/${format}`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `resume.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                const errorText = await response.text();
                alert(`Произошла ошибка: ${errorText}`);
            }
        } catch (error) {
            console.error('Ошибка при отправке запроса:', error);
            alert('Не удалось связаться с сервером.');
        } finally {
            loader.classList.add('loader-hidden');
        }
    };

    pdfButton.addEventListener('click', () => generateResume('pdf'));
    pngButton.addEventListener('click', () => generateResume('png'));
    
    setLanguage('ru');
});