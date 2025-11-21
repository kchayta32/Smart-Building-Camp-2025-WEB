// --- ตั้งค่า API KEY ---
const API_KEY = "AIzaSyA8CZ1DTS4QK5fp1BTZHOfB5qBPH52DFug";

// ชื่อโมเดล
let MODEL_NAME = "gemini-2.5-flash";

let originalTexts = new Map();
let currentLang = 'th'; // เก็บสถานะภาษาปัจจุบัน

document.addEventListener("DOMContentLoaded", () => {
    // Inject CSS สำหรับ Dropdown สวยๆ
    addLanguageStyles();
    createLanguageSwitcher();
    saveOriginalTexts();
});

// 1. ฟังก์ชันเพิ่ม CSS (เพื่อให้แสดงผลสวยทั้ง PC และ Mobile)
function addLanguageStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .lang-container {
            position: relative;
            display: inline-block;
            z-index: 2000;
        }
        .lang-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 20px;
            padding: 5px 12px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Sarabun', sans-serif;
            transition: 0.3s;
        }
        .lang-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .lang-btn img {
            width: 20px;
            height: 15px;
            object-fit: cover;
            border-radius: 2px;
        }
        .lang-dropdown {
            position: absolute;
            top: 120%;
            right: 0; /* ชิดขวา */
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            padding: 5px 0;
            min-width: 120px;
            display: none; /* ซ่อนก่อน */
            flex-direction: column;
            animation: fadeIn 0.2s ease-in-out;
        }
        .lang-dropdown.show {
            display: flex;
        }
        .lang-option {
            padding: 8px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            color: #333;
            font-size: 0.9rem;
            transition: 0.2s;
        }
        .lang-option:hover {
            background-color: #f0f0f0;
            color: #004aad; /* สีธีมหลัก */
        }
        .lang-option img {
            width: 20px;
            height: 15px;
            border-radius: 2px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// 2. สร้าง Dropdown แบบ Custom (ใช้รูปภาพจริงแทน Emoji)
function createLanguageSwitcher() {
    const nav = document.querySelector('.nav-menu ul') || document.querySelector('nav ul');
    if (!nav || document.getElementById('langSelectorLi')) return;

    const li = document.createElement('li');
    li.id = 'langSelectorLi';

    // ใช้รูปธงจาก Cloudflare CDN (เสถียรและเร็ว)
    const flags = {
        th: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/th.svg',
        en: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/gb.svg',
        lo: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/la.svg'
    };

    li.innerHTML = `
        <div class="lang-container" id="langContainer">
            <div class="lang-btn" id="currentLangBtn">
                <img src="${flags.th}" alt="TH"> 
                <span>TH</span>
                <i class="fas fa-chevron-down" style="font-size: 0.7rem;"></i>
            </div>
            
            <div class="lang-dropdown" id="langDropdown">
                <div class="lang-option" onclick="changeLanguage('th', '${flags.th}', 'TH')">
                    <img src="${flags.th}"> ไทย
                </div>
                <div class="lang-option" onclick="changeLanguage('en', '${flags.en}', 'EN')">
                    <img src="${flags.en}"> English
                </div>
                <div class="lang-option" onclick="changeLanguage('lo', '${flags.lo}', 'LA')">
                    <img src="${flags.lo}"> ລາວ
                </div>
            </div>

            <span id="loadingLang" style="display:none; position: absolute; right: -25px; top: 8px; color:#ffeb3b;">
                <i class="fas fa-circle-notch fa-spin"></i>
            </span>
        </div>
    `;
    nav.appendChild(li);

    // Logic เปิด/ปิด Dropdown
    const btn = document.getElementById('currentLangBtn');
    const dropdown = document.getElementById('langDropdown');
    const container = document.getElementById('langContainer');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    // คลิกที่อื่นเพื่อปิด
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// 3. ฟังก์ชันเปลี่ยนภาษา (เรียกใช้จาก HTML)
window.changeLanguage = function (lang, flagUrl, label) {
    // อัปเดตปุ่มหลัก
    const btn = document.getElementById('currentLangBtn');
    btn.innerHTML = `<img src="${flagUrl}"> <span>${label}</span> <i class="fas fa-chevron-down" style="font-size: 0.7rem;"></i>`;

    // ปิด Dropdown
    document.getElementById('langDropdown').classList.remove('show');

    // เรียก Logic เดิม
    if (lang === currentLang) return;
    currentLang = lang;

    if (lang === 'th') restoreOriginalTexts();
    else translatePageWithGemini(lang);
}

// --- Logic เดิม (Save/Restore/Translate) ---

function saveOriginalTexts() {
    const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'span', 'strong', 'b', 'i', 'em', 'small',
        'a', 'button', 'label',
        '.faculty-name', '.project-name', '.card-title', '.timeline-label'
    ];

    const elements = document.querySelectorAll(selectors.join(','));

    elements.forEach((el, index) => {
        if (el.children.length > 0 && el.tagName !== 'A' && el.tagName !== 'BUTTON') return;

        const text = el.innerText.trim();
        // เพิ่มเช็ค closest('.lang-container') เพื่อไม่ให้แปลเมนูภาษา
        if (text !== "" && isNaN(text) && !el.closest('#langSelectorLi') && !el.closest('.lang-container') && !el.hasAttribute('data-no-translate')) {
            el.dataset.transId = index;
            originalTexts.set(index, text);
        }
    });
}

function restoreOriginalTexts() {
    const elements = document.querySelectorAll('[data-trans-id]');
    elements.forEach(el => {
        const id = parseInt(el.dataset.transId);
        if (originalTexts.has(id)) el.innerText = originalTexts.get(id);
    });
}

async function translatePageWithGemini(targetLang) {
    const loading = document.getElementById('loadingLang');

    if (!API_KEY || API_KEY.includes("YOUR_GEMINI_API_KEY")) {
        alert("กรุณาใส่ API Key ก่อนครับ"); return;
    }

    loading.style.display = 'inline-block';

    let textBatch = [];
    let idBatch = [];

    const elements = document.querySelectorAll('[data-trans-id]');
    elements.forEach(el => {
        const original = originalTexts.get(parseInt(el.dataset.transId));
        if (original) {
            textBatch.push(original);
            idBatch.push(el.dataset.transId);
        }
    });

    if (textBatch.length === 0) { loading.style.display = 'none'; return; }

    if (textBatch.length > 50) { textBatch = textBatch.slice(0, 50); idBatch = idBatch.slice(0, 50); }

    const langName = targetLang === 'en' ? 'English' : 'Lao';
    const prompt = `Translate to ${langName}. Return JSON array of strings only. Input: ${JSON.stringify(textBatch)}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        let translatedTextRaw = data.candidates[0].content.parts[0].text;
        translatedTextRaw = translatedTextRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        const translatedArray = JSON.parse(translatedTextRaw);

        idBatch.forEach((id, index) => {
            if (translatedArray[index]) {
                const el = document.querySelector(`[data-trans-id="${id}"]`);
                if (el) el.innerText = translatedArray[index];
            }
        });

    } catch (error) {
        console.error("Translation Failed:", error);
        alert("แปลภาษาขัดข้อง: " + error.message);
        restoreOriginalTexts();
    } finally {
        loading.style.display = 'none';
    }
}