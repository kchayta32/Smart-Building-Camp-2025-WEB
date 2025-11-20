// --- ตั้งค่า API KEY ---
const API_KEY = "AIzaSyA8CZ1DTS4QK5fp1BTZHOfB5qBPH52DFug"; // <--- ใส่ Key ของคุณตรงนี้

// ชื่อโมเดล (ถ้า flash ไม่ได้ ให้ลอง gemini-1.0-pro)
let MODEL_NAME = "gemini-2.5-flash"; 

let originalTexts = new Map();

document.addEventListener("DOMContentLoaded", () => {
    createLanguageSwitcher();
    saveOriginalTexts();
});

function createLanguageSwitcher() {
    const nav = document.querySelector('.nav-menu ul') || document.querySelector('nav ul');
    if (!nav || document.getElementById('langSelectorLi')) return;

    const li = document.createElement('li');
    li.id = 'langSelectorLi';
    // ปรับสไตล์ให้ดูดีขึ้นและไม่เบียดเมนูอื่น
    li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px;">
            <select id="langSelector" style="padding: 5px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.5); background: rgba(0,0,0,0.2); color: white; font-family: 'Sarabun'; cursor: pointer; outline: none;">
                <option value="th" style="color:black;">🇹🇭 TH</option>
                <option value="en" style="color:black;">🇬🇧 EN</option>
                <option value="lo" style="color:black;">🇱🇦 LA</option>
            </select>
            <span id="loadingLang" style="display:none; font-size:0.8rem; color:#ffeb3b;">
                <i class="fas fa-circle-notch fa-spin"></i>
            </span>
        </div>
    `;
    nav.appendChild(li);

    document.getElementById('langSelector').addEventListener('change', function() {
        const lang = this.value;
        if (lang === 'th') restoreOriginalTexts();
        else translatePageWithGemini(lang);
    });
}

function saveOriginalTexts() {
    // *** จุดที่แก้ไข: เอา li, th, td ออก เพื่อป้องกันการทับลิงก์หรือโครงสร้าง ***
    // เลือกเฉพาะ element ที่เป็น "เนื้อหา" จริงๆ
    const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'p', 'span', 'strong', 'b', 'i', 'em', 'small',
        'a',         // <--- เน้นที่ a แทน li
        'button', 
        'label',
        '.faculty-name', 
        '.project-name',
        '.card-title',
        '.timeline-label'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    
    elements.forEach((el, index) => {
        // ป้องกันการเลือก element ที่มีลูกเป็น element อื่น (เลือกเฉพาะใบไม้ปลายสุด)
        // ยกเว้น a เพราะบางที a มี text เลย
        if (el.children.length > 0 && el.tagName !== 'A' && el.tagName !== 'BUTTON') return;

        const text = el.innerText.trim();
        // เก็บเฉพาะที่มีข้อความ, ไม่ใช่ตัวเลขล้วน, ไม่ใช่ช่องเปลี่ยนภาษา
        if (text !== "" && isNaN(text) && !el.closest('#langSelectorLi') && !el.hasAttribute('data-no-translate')) {
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
    const selector = document.getElementById('langSelector');
    
    if(!API_KEY || API_KEY.includes("YOUR_GEMINI_API_KEY")) {
        alert("กรุณาใส่ API Key ก่อนครับ"); selector.value = 'th'; return;
    }

    loading.style.display = 'inline-block';
    selector.disabled = true;

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

    if (textBatch.length === 0) { loading.style.display = 'none'; selector.disabled = false; return; }
    
    // ตัดแบ่งส่งทีละ 50 ข้อความป้องกัน Error
    if(textBatch.length > 50) { textBatch = textBatch.slice(0, 50); idBatch = idBatch.slice(0, 50); }

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
        selector.value = 'th';
        restoreOriginalTexts();
    } finally {
        loading.style.display = 'none';
        selector.disabled = false;
    }
}