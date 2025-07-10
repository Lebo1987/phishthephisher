from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv
import base64
from PIL import Image
import io
import pytesseract
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# === Database setup ===
def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )''')
    conn.commit()
    conn.close()

init_db()

# Fallback OCR function
def extract_text_with_ocr(image):
    try:
        # Extract text using OCR
        text = pytesseract.image_to_string(image, lang='eng+heb+ara+rus+chi_sim+jpn')
        return text.strip()
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

@app.route("/")
def home():
    return send_from_directory('.', 'index.html')

@app.route("/analyze", methods=["POST"])
def analyze_message():
    data = request.get_json()
    message = data.get("message", "")
    language = data.get("language", "en")  # Default to English

    if not message:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Create language-specific prompts
        language_prompts = {
            "he": "אתה מנתח סיכונים של הודעות פישינג. תן ציון בין 0-100 למידת הסיכון: 0=בטוח, 100=פישינג מובהק. ציין גם אם זו הודעה בטוחה, חשודה, או פישינג, והסבר בקצרה למה.",
            "ar": "أنت محلل مخاطر رسائل التصيد الاحتيالي. أعطِ درجة من 0-100 لمستوى المخاطر: 0=آمن، 100=تصيد احتيالي واضح. حدد أيضًا ما إذا كانت الرسالة آمنة أو مشبوهة أو تصيد احتيالي، واشرح باختصار السبب.",
            "es": "Eres un analizador de riesgos de mensajes de phishing. Da una puntuación de 0-100 para el nivel de riesgo: 0=seguro, 100=phishing definitivo. También indica si es un mensaje seguro, sospechoso o phishing, y explica brevemente por qué.",
            "fr": "Vous êtes un analyseur de risques de messages de phishing. Donnez un score de 0-100 pour le niveau de risque: 0=sûr, 100=phishing définitif. Indiquez également s'il s'agit d'un message sûr, suspect ou phishing, et expliquez brièvement pourquoi.",
            "de": "Sie sind ein Risikoanalysator für Phishing-Nachrichten. Geben Sie eine Bewertung von 0-100 für das Risikoniveau: 0=sicher, 100=definitiv Phishing. Geben Sie auch an, ob es sich um eine sichere, verdächtige oder Phishing-Nachricht handelt, und erklären Sie kurz warum.",
            "ru": "Вы аналитик рисков фишинговых сообщений. Дайте оценку от 0-100 для уровня риска: 0=безопасно, 100=определенно фишинг. Также укажите, является ли это безопасным, подозрительным или фишинговым сообщением, и кратко объясните почему.",
            "zh": "您是网络钓鱼消息风险分析师。给出0-100的风险等级评分：0=安全，100=确定钓鱼。同时说明这是安全、可疑还是钓鱼消息，并简要解释原因。",
            "ja": "あなたはフィッシングメッセージのリスク分析者です。リスクレベルを0-100で評価してください：0=安全、100=確実なフィッシング。また、安全、疑わしい、またはフィッシングメッセージかどうかを示し、簡単に理由を説明してください。"
        }
        
        # Get the appropriate prompt for the detected language
        system_prompt = language_prompts.get(language, 
            "You are a risk analyzer for phishing messages. "
            "Give a score between 0-100 for risk level: "
            "0=safe, 100=definite phishing. "
            "Also indicate if this is a safe, suspicious, or phishing message, and explain briefly why. "
            "If the message contains a link to a login page (such as https://login.microsoftonline.com/...), "
            "analyze the link and try to determine if it could be part of an OAUTH or Entra-enabled phishing attack. "
            "Look for suspicious client_id, redirect_uri, or unusual permission scopes."
        )

        # שליחת ההודעה ל־GPT
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {"role": "user", "content": message}
            ]
        )

        reply = response.choices[0].message.content.strip()

        # ניסיון לחלץ ציון מתוך התגובה
        import re
        score_match = re.search(r'(\d{1,3})\s*[%/100]?', reply)
        score = int(score_match.group(1)) if score_match else 50

        if score >= 85:
            level = "phishing"
        elif score >= 60:
            level = "suspicious"
        else:
            level = "safe"

        # פיצול הסבר לנקודות
        reasons = re.split(r'\. |\n', reply)
        reasons = [r.strip("•*- ") for r in reasons if r.strip()]

        return jsonify({
            "score": score,
            "level": level,
            "reasons": reasons,
            "language": language
        })

    except Exception as e:
        print("❌ Server error:\n", e)
        return jsonify({"error": "Server error"}), 500

@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No image selected"}), 400

    try:
        # Read and process the image
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Try GPT-4 Vision first
        try:
            # Convert image to base64 for GPT-4 Vision
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            # Analyze with GPT-4 Vision
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a risk analyzer for phishing messages. "
                            "Analyze the text in this image and give a score between 0-100 for risk level: "
                            "0=safe, 100=definite phishing. "
                            "Also indicate if this is a safe, suspicious, or phishing message, and explain briefly why."
                        )
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze the text in this image for phishing risk:"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{img_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300
            )

            reply = response.choices[0].message.content.strip()
            
        except Exception as gpt_error:
            print(f"GPT-4 Vision failed: {gpt_error}")
            # Fallback to OCR + text analysis
            extracted_text = extract_text_with_ocr(image)
            if not extracted_text:
                return jsonify({"error": "Could not extract text from image"}), 400
            
            # Analyze extracted text with regular GPT
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a risk analyzer for phishing messages. "
                            "Analyze the text and give a score between 0-100 for risk level: "
                            "0=safe, 100=definite phishing. "
                            "Also indicate if this is a safe, suspicious, or phishing message, and explain briefly why."
                        )
                    },
                    {"role": "user", "content": f"Analyze this text for phishing risk: {extracted_text}"}
                ]
            )
            reply = response.choices[0].message.content.strip()

        # Extract score from response
        import re
        score_match = re.search(r'(\d{1,3})\s*[%/100]?', reply)
        score = int(score_match.group(1)) if score_match else 50

        if score >= 85:
            level = "phishing"
        elif score >= 60:
            level = "suspicious"
        else:
            level = "safe"

        # Split explanation into points
        reasons = re.split(r'\. |\n', reply)
        reasons = [r.strip("•*- ") for r in reasons if r.strip()]

        return jsonify({
            "score": score,
            "level": level,
            "reasons": reasons
        })

    except Exception as e:
        print("❌ Image analysis error:\n", e)
        return jsonify({"error": "Image analysis failed"}), 500

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('SELECT id FROM users WHERE email = ?', (email,))
    if c.fetchone():
        conn.close()
        return jsonify({'error': 'User already exists'}), 409
    password_hash = generate_password_hash(password)
    c.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', (email, password_hash))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User registered successfully'})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('SELECT password_hash FROM users WHERE email = ?', (email,))
    row = c.fetchone()
    conn.close()
    if not row or not check_password_hash(row[0], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    return jsonify({'message': 'Login successful'})

@app.route('/contact', methods=['POST'])
def contact():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'error': 'All fields are required.'}), 400

    # Email config from environment variables
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    support_email = 'support@phishthephisher.com'

    # Check SMTP config
    if not smtp_server or not smtp_user or not smtp_password:
        return jsonify({'error': 'SMTP configuration is missing.'}), 500

    # Compose email
    subject = f"New Contact Form Submission from {name}"
    body = f"Name: {name}\nEmail: {email}\nMessage:\n{message}"
    msg = MIMEMultipart()
    msg['From'] = smtp_user or email
    msg['To'] = support_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(msg['From'], support_email, msg.as_string())
        return jsonify({'success': True})
    except Exception as e:
        print(f"Mail send error: {e}")
        return jsonify({'error': 'Failed to send email.'}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
