// --- ตั้งค่า API KEY ---
const API_KEY = "AIzaSyA8CZ1DTS4QK5fp1BTZHOfB5qBPH52DFug"; // <--- ใส่ Gemini API Key ตรงนี้

// เก็บข้อความต้นฉบับไว้กันหาย (Dictionary)
let originalTexts = new Map();

document.addEventListener("DOMContentLoaded", () => {
    // 1. สร้างปุ่มเปลี่ยนภาษาแทรกเข้าไปใน Header
    createLanguageSwitcher();

    // 2. บันทึกข้อความไทยต้นฉบับไว้ก่อน
    saveOriginalTexts();
});

function createLanguageSwitcher() {
    const nav = document.querySelector('.nav-menu ul') || document.querySelector('nav ul');
    if (!nav) return;

    const li = document.createElement('li');
    li.innerHTML = `
        <select id="langSelector" style="padding: 5px; border-radius: 5px; border: 1px solid #ccc; font-family: 'Sarabun'; cursor: pointer;">
            <option value="th">🇹🇭 ไทย (Original)</option>
            <option value="en">🇬🇧 English</option>
            <option value="lo">🇱🇦 ลาว (Lao)</option>
        </select>
        <span id="loadingLang" style="display:none; font-size:0.8rem; color:yellow; margin-left:5px;">
            <i class="fas fa-spinner fa-spin"></i> แปลภาษา...
        </span>
    `;
    nav.appendChild(li);

    // Event Listener เมื่อเปลี่ยนค่า
    document.getElementById('langSelector').addEventListener('change', function () {
        const lang = this.value;
        if (lang === 'th') {
            restoreOriginalTexts();
        } else {
            translatePageWithGemini(lang);
        }
    });
}

// ฟังก์ชันเก็บข้อความเดิม
function saveOriginalTexts() {
    // เลือกเฉพาะ Element ที่มีตัวหนังสือ
    const elements = document.querySelectorAll('h1, h2, h3, h4, p, a, span, li, button, label, th, td, .faculty-name, .project-name');

    elements.forEach((el, index) => {
        // เก็บเฉพาะโหนดที่มีข้อความจริงๆ และไม่ใช่ตัวเลขล้วน
        if (el.innerText.trim() !== "" && !el.hasAttribute('data-no-translate')) {
            // สร้าง ID อ้างอิง
            el.dataset.transId = index;
            originalTexts.set(index, el.innerText);
        }
    });
}

// ฟังก์ชันคืนค่าเดิม (ภาษาไทย)
function restoreOriginalTexts() {
    const elements = document.querySelectorAll('[data-trans-id]');
    elements.forEach(el => {
        const id = parseInt(el.dataset.transId);
        if (originalTexts.has(id)) {
            el.innerText = originalTexts.get(id);
        }
    });
}

// ฟังก์ชันเรียก Gemini
async function translatePageWithGemini(targetLang) {
    const loading = document.getElementById('loadingLang');
    const selector = document.getElementById('langSelector');

    loading.style.display = 'inline-block';
    selector.disabled = true;

    // 1. รวบรวมข้อความที่จะแปล (ส่งไปเป็นก้อนเพื่อประหยัด API call)
    let textBatch = [];
    let idBatch = [];

    const elements = document.querySelectorAll('[data-trans-id]');
    elements.forEach(el => {
        // แปลเฉพาะสิ่งที่ยังไม่ได้แปล หรือแปลทับไปเลยก็ได้
        // เอาข้อความต้นฉบับ (ไทย) ส่งไปแปลเสมอ เพื่อความแม่นยำ
        const original = originalTexts.get(parseInt(el.dataset.transId));
        if (original) {
            textBatch.push(original);
            idBatch.push(el.dataset.transId);
        }
    });

    if (textBatch.length === 0) {
        loading.style.display = 'none';
        selector.disabled = false;
        return;
    }

    // 2. สร้าง Prompt
    const langName = targetLang === 'en' ? 'English' : 'Lao';
    const prompt = `
        You are a professional translator for a Smart Building Engineering Camp website.
        Translate the following array of Thai texts into ${langName}.
        Maintain the original tone (Formal/Academic).
        Do not translate technical terms like "Smart Building", "IoT", "AI" unless necessary.
        IMPORTANT: Return ONLY a JSON array of strings. No markdown, no explanation.
        
        Input Array: ${JSON.stringify(textBatch)}
    `;

    try {
        // 3. ยิง API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // 4. แกะผลลัพธ์
        let translatedTextRaw = data.candidates[0].content.parts[0].text;

        // ล้าง Markdown (```json ... ```) ออกถ้ามี
        translatedTextRaw = translatedTextRaw.replace(/```json/g, '').replace(/```/g, '').trim();

        const translatedArray = JSON.parse(translatedTextRaw);

        // 5. อัปเดตหน้าเว็บ
        if (translatedArray.length === idBatch.length) {
            idBatch.forEach((id, index) => {
                const el = document.querySelector(`[data-trans-id="${id}"]`);
                if (el) {
                    el.innerText = translatedArray[index];
                }
            });
        } else {
            console.error("จำนวนประโยคที่แปลไม่เท่ากับต้นฉบับ");
        }

    } catch (error) {
        console.error("Translation Error:", error);
        alert("เกิดข้อผิดพลาดในการแปลภาษา (API Quota หรือ Network Error)");
        // คืนค่าเดิมถ้าพัง
        document.getElementById('langSelector').value = 'th';
        restoreOriginalTexts();
    } finally {
        loading.style.display = 'none';
        selector.disabled = false;
    }
}