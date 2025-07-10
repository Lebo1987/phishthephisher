const form = document.getElementById("analyze-form");
const input = document.getElementById("message");
const resultContainer = document.getElementById("result");
const button = document.getElementById("analyze-button");
const uploadBtn = document.getElementById("uploadBtn");
const imageInput = document.getElementById("imageInput");
const modal = document.getElementById("payment-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const continueBtn = document.getElementById("continue-btn");
const cancelBtn = document.getElementById("cancel-btn");
const closeBtn = document.querySelector(".close");
const remainingAnalysesSpan = document.getElementById("remaining-analyses");

// Usage tracking
let remainingAnalyses = parseInt(localStorage.getItem('remainingAnalyses')) || 3;

// Update display
function updateUsageDisplay() {
  if (remainingAnalysesSpan) {
    remainingAnalysesSpan.textContent = remainingAnalyses;
  }
}

// Check if user has remaining analyses
function hasRemainingAnalyses() {
  return remainingAnalyses > 0;
}

// Decrease usage count
function decreaseUsage() {
  remainingAnalyses--;
  localStorage.setItem('remainingAnalyses', remainingAnalyses);
  updateUsageDisplay();
}

// Initialize display
if (remainingAnalysesSpan) {
  updateUsageDisplay();
}

// Reset button for testing
const resetUsageBtn = document.getElementById("reset-usage");
if (resetUsageBtn) {
  resetUsageBtn.addEventListener("click", () => {
    remainingAnalyses = 3;
    localStorage.setItem('remainingAnalyses', remainingAnalyses);
    updateUsageDisplay();
    console.log("Usage reset to 3");
  });
}

// Debug: Check if elements are found
console.log("Form found:", form);
console.log("Button found:", button);
console.log("Language detection ready");
console.log("Remaining analyses:", remainingAnalyses);

// Language messages
const languageMessages = {
  he: {
    title: "נדרש מנוי פרימיום",
    message: "ניתוח בשפות נוספות מעבר לאנגלית דורש מנוי פרימיום. האם להמשיך?",
    continue: "המשך עם פרימיום",
    cancel: "ביטול"
  },
  ar: {
    title: "مطلوب اشتراك مميز",
    message: "تحليل اللغات بخلاف الإنجليزية يتطلب اشتراكًا مميزًا. هل تريد المتابعة؟",
    continue: "المتابعة مع الاشتراك المميز",
    cancel: "إلغاء"
  },
  es: {
    title: "Se requiere suscripción premium",
    message: "El análisis en idiomas distintos al inglés requiere una suscripción premium. ¿Continuar?",
    continue: "Continuar con premium",
    cancel: "Cancelar"
  },
  fr: {
    title: "Abonnement premium requis",
    message: "L'analyse dans des langues autres que l'anglais nécessite un abonnement premium. Continuer?",
    continue: "Continuer avec premium",
    cancel: "Annuler"
  },
  de: {
    title: "Premium-Abonnement erforderlich",
    message: "Die Analyse in anderen Sprachen als Englisch erfordert ein Premium-Abonnement. Fortfahren?",
    continue: "Mit Premium fortfahren",
    cancel: "Abbrechen"
  },
  ru: {
    title: "Требуется премиум-подписка",
    message: "Анализ на языках, отличных от английского, требует премиум-подписки. Продолжить?",
    continue: "Продолжить с премиум",
    cancel: "Отмена"
  },
  zh: {
    title: "需要高级订阅",
    message: "除英语外的其他语言分析需要高级订阅。继续吗？",
    continue: "继续使用高级版",
    cancel: "取消"
  },
  ja: {
    title: "プレミアムサブスクリプションが必要",
    message: "英語以外の言語での分析にはプレミアムサブスクリプションが必要です。続行しますか？",
    continue: "プレミアムで続行",
    cancel: "キャンセル"
  }
};

// Default English messages
const defaultMessages = {
  title: "Premium Required",
  message: "Analysis in languages other than English requires a premium subscription. Continue?",
  continue: "Continue with Premium",
  cancel: "Cancel"
};

// Simple language detection function
function detectLanguageSimple(text) {
  // החלף גרשיים חכמים לגרש רגיל
  text = text.replace(/[’‘]/g, "'");
  // אפשר תווים נפוצים נוספים (כולל קווים מפרידים, אחוז, סימני URL, גרשיים חכמים, קו מפריד, ועוד)
  if (/^[a-zA-Z0-9.,!?\s'"\-:;()\[\]{}@#$%^&*_+=/\\|<>~`%&@/\\^–—’‘]+$/.test(text)) {
    // אם יש תווים דיאקריטיים (é, ñ, ü, ç, à וכו') → לא אנגלית
    if (/[éèêëáàâäíìîïóòôöúùûüñç]/i.test(text)) return 'other';
    // בדיקה למילים נפוצות בספרדית/צרפתית
    const words = text.toLowerCase().split(/\s+/);
    const spanish = ['el','la','de','que','y','en','los','del','se','las'];
    const french = ['le','la','de','est','et','les','des','en','un','une'];
    if (words.some(w => spanish.includes(w))) return 'other';
    if (words.some(w => french.includes(w))) return 'other';
    return 'en';
  }
  // Hebrew
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  // Arabic
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  // Russian
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  // Chinese
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  // Japanese
  if (/[\u3040-\u30FF]/.test(text) || /[\u30A0-\u30FF]/.test(text)) return 'ja';
  // ברירת מחדל: לא אנגלית
  return 'other';
}

// Detect language and show modal if needed
function detectLanguageAndShowModal(text) {
  if (!text.trim()) return false;
  
  const detectedLang = detectLanguageSimple(text);
  console.log("Detected language:", detectedLang);
  
  // If not English, show modal
  if (detectedLang !== 'en') {
    const messages = languageMessages[detectedLang] || defaultMessages;
    
    modalTitle.textContent = messages.title;
    modalMessage.textContent = messages.message;
    continueBtn.textContent = messages.continue;
    cancelBtn.textContent = messages.cancel;
    
    modal.style.display = 'flex';
    return true;
  }
  
  return false;
}

// Show payment modal
function showPaymentModal(message) {
  modalTitle.textContent = "Upgrade to Premium";
  modalMessage.textContent = message;
  modal.style.display = "block";
}

// Modal event listeners
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    window.location.href = "pricing.html";
    modal.style.display = "none";
  });
}

// Close modal when clicking outside
if (modal) {
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Handle form submission
if (form) {
form.addEventListener("submit", async (e) => {
  e.preventDefault();
    console.log("Form submitted!");
    
    const message = input.value.trim();
    if (!message) return;

    // Check if user has remaining analyses
    if (!hasRemainingAnalyses()) {
      showPaymentModal("You've used all your free analyses. Upgrade to premium for unlimited scans!");
      return;
    }

    // Check if language requires premium
    if (detectLanguageAndShowModal(message)) {
      console.log("Showing premium modal for non-English language");
      return; // Modal will handle the analysis
    }
    
    // If English, proceed directly
    console.log("Proceeding with English analysis");
    performAnalysis();
  });
}

// === Registration form handler ===
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const errorDiv = document.getElementById("register-error");
    errorDiv.textContent = "";
    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        errorDiv.style.color = "#43a047";
        errorDiv.textContent = "Registration successful! Redirecting to sign in...";
        setTimeout(() => { window.location.href = "login.html"; }, 1200);
      } else {
        errorDiv.style.color = "#e53935";
        errorDiv.textContent = data.error || "Registration failed.";
      }
    } catch (err) {
      errorDiv.style.color = "#e53935";
      errorDiv.textContent = "Server error. Please try again.";
    }
  });
}

// === Login form handler ===
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errorDiv = document.getElementById("login-error");
    errorDiv.textContent = "";
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        errorDiv.style.color = "#43a047";
        errorDiv.textContent = "Login successful! Redirecting...";
        setTimeout(() => { window.location.href = "index.html"; }, 1200);
      } else {
        errorDiv.style.color = "#e53935";
        errorDiv.textContent = data.error || "Login failed.";
      }
    } catch (err) {
      errorDiv.style.color = "#e53935";
      errorDiv.textContent = "Server error. Please try again.";
    }
  });
}

// Perform the actual analysis
async function performAnalysis() {
  const message = input.value.trim();
  if (!message) return;

  // Check if user has remaining analyses
  if (!hasRemainingAnalyses()) {
    showPaymentModal("You've used all your free analyses. Upgrade to premium for unlimited scans!");
    return;
  }

  // Show loading state
  button.disabled = true;
  button.classList.add("button-loading");
  button.innerHTML = '<span class="loading-spinner"></span>Analyzing...';

  // Clear previous result
  resultContainer.innerHTML = "";

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    console.log("📦 API response:", data);

    if (data.level && data.reasons) {
      // Decrease usage count
      decreaseUsage();
      
      let reasonsArray = [];

      if (Array.isArray(data.reasons)) {
        reasonsArray = data.reasons;
      } else if (typeof data.reasons === "string") {
        reasonsArray = data.reasons.split(/(?<=[.!?])\s+/);
      }

      const confidence = data.score || 90;

      let colorClass = "green";
      if (data.level === "phishing") {
        colorClass = "red";
      } else if (data.level === "suspicious") {
        colorClass = "orange";
      }

      resultContainer.innerHTML = `
        <div class="analysis-result ${colorClass}">
          <h3>Analysis Result</h3>
          ${formatBullets(reasonsArray)}
          <div class="confidence ${colorClass}">${confidence}% confidence</div>
        </div>
      `;
    } else {
      resultContainer.innerHTML = `<p style="color:red;">❌ ${data.error || "No response received."}</p>`;
    }
  } catch (err) {
    resultContainer.innerHTML = `<p style="color:red;">❌ Server error</p>`;
    console.error(err);
  }

  // Reset button
  button.disabled = false;
  button.classList.remove("button-loading");
  button.innerHTML = "🔎 Detect Risk";
}

// Handle upload button click
if (uploadBtn) {
  uploadBtn.addEventListener("click", () => {
    // Check if user has remaining analyses
    if (!hasRemainingAnalyses()) {
      showPaymentModal("You've used all your free analyses. Upgrade to premium for unlimited scans!");
      return;
    }
    
    imageInput.click();
  });
}

// Handle image file selection
if (imageInput) {
  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if it's an image file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Check if user has remaining analyses
    if (!hasRemainingAnalyses()) {
      showPaymentModal("You've used all your free analyses. Upgrade to premium for unlimited scans!");
      return;
    }

    // Show loading with spinner
    uploadBtn.disabled = true;
    uploadBtn.classList.add("button-loading");
    uploadBtn.innerHTML = '<span class="loading-spinner"></span>Processing...';

    // Clear previous result
    resultContainer.innerHTML = "";

    try {
      // Create FormData to send the image
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch("/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("📦 Image API response:", data);

      if (data.level && data.reasons) {
        // Decrease usage count
        decreaseUsage();
        
        let reasonsArray = [];

        if (Array.isArray(data.reasons)) {
          reasonsArray = data.reasons;
        } else if (typeof data.reasons === "string") {
          reasonsArray = data.reasons.split(/(?<=[.!?])\s+/);
        }

        const confidence = data.score || 90;

        let colorClass = "green";
        if (data.level === "phishing") {
          colorClass = "red";
        } else if (data.level === "suspicious") {
          colorClass = "orange";
        }

        resultContainer.innerHTML = `
          <div class="analysis-result ${colorClass}">
            <h3>Image Analysis Result</h3>
            <div class="image-preview">
              <img src="${URL.createObjectURL(file)}" alt="Uploaded image" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin: 10px 0;">
            </div>
            ${formatBullets(reasonsArray)}
            <div class="confidence ${colorClass}">${confidence}% confidence</div>
          </div>
        `;
      } else {
        resultContainer.innerHTML = `<p style="color:red;">❌ ${data.error || "No response received."}</p>`;
      }
    } catch (err) {
      resultContainer.innerHTML = `<p style="color:red;">❌ Server error</p>`;
      console.error(err);
    }

    // Reset button
    uploadBtn.disabled = false;
    uploadBtn.classList.remove("button-loading");
    uploadBtn.innerHTML = "📁 Upload Image";
  });
}

// ✅ Function for formatting bullets – safe for both string and array
function formatBullets(input) {
  let items = [];

  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === "string") {
    items = input.split(/(?<=[.!?])\s+/);
  }

  return "<ul>" + items.map(s => `<li>${s}</li>`).join("") + "</ul>";
}

function showResult(result) {
  // דוגמה: result = { risk: 'red'|'orange'|'green', confidence: 95, desc: '...', ... }
  let icon = '❌', title = 'Scam Detected!', color = 'red', desc = 'This message is highly likely to be a scam.';
  if (result.risk === 'orange') {
    icon = '⚠️';
    title = 'Suspicious';
    color = 'orange';
    desc = 'This message may be suspicious.';
  } else if (result.risk === 'green') {
    icon = '✅';
    title = 'Safe';
    color = 'green';
    desc = 'No scam detected.';
  }
  // אם יש תיאור מותאם מהשרת, נשתמש בו (רק שורה קצרה)
  if (result.desc) desc = result.desc;
  const html = `
    <div class="result-card ${color}">
      <div class="result-icon">${icon}</div>
      <div class="result-title">${title}</div>
      <div class="result-confidence">${result.confidence || ''}% confidence</div>
      <div class="result-desc">${desc}</div>
      <button class="result-action" onclick="location.reload()">Try Another</button>
    </div>
  `;
  document.getElementById('result').innerHTML = html;
}
