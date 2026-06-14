import streamlit as st
import os
import json
import re
import io
from PIL import Image
from streamlit_mic_recorder import mic_recorder, speech_to_text

# Import our utility functions
from utils_ai import analyze_soil_report_ai, diagnose_leaf_disease_ai, chat_voice_ai, is_leaf_image_py
from utils_voice import translate_text, transcribe_audio, text_to_speech_bytes, LANG_MAP

# Load persistent config
CONFIG_FILE = ".krishimitra_config.json"

import http.cookies
from streamlit.web.server.websocket_headers import _get_websocket_headers

def get_cookies():
    try:
        headers = _get_websocket_headers()
        if not headers:
            return {}
        cookie_header = headers.get("Cookie", "")
        cookie = http.cookies.SimpleCookie()
        cookie.load(cookie_header)
        return {k: v.value for k, v in cookie.items()}
    except Exception as e:
        print(f"Error reading cookies: {str(e)}")
        return {}

def load_config():
    default_config = {
        "mode": "Cloud",
        "cloud_provider": "Groq",
        "gemini_key": "",
        "groq_key": "",
        "ollama_host": "http://localhost:11434",
        "ollama_model": "llama3.2",
        "gemini_model": "gemini-1.5-flash",
        "language": "English"
    }
    
    # Check if we are running in a deployed environment
    is_deployed = (
        os.environ.get("STREAMLIT_SHARING_AUTHOR") is not None or 
        os.environ.get("RENDER") is not None or 
        os.environ.get("RAILWAY_STATIC_URL") is not None or
        os.environ.get("PORT") is not None or
        os.environ.get("STREAMLIT_SERVER_HEADLESS") == "true"
    )
    
    # Read cookies to see if user has previously used keys
    cookies = get_cookies()
    
    # If cookies are present, they override defaults
    for key in ["gemini_key", "groq_key", "mode", "cloud_provider", "language", "gemini_model", "ollama_host", "ollama_model"]:
        if key in cookies and cookies[key] is not None:
            default_config[key] = cookies[key]
            
    # Load from file if not deployed and no cookies are set
    if not is_deployed and os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                saved = json.load(f)
                # Auto-migrate Cloud API settings from OpenAI to Groq
                if saved.get("cloud_provider") == "OpenAI":
                    saved["cloud_provider"] = "Groq"
                if "openai_key" in saved:
                    saved["groq_key"] = saved.pop("openai_key")
                
                # Only load keys from file if not already set by cookies
                for k, v in saved.items():
                    if k not in cookies:
                        default_config[k] = v
        except Exception:
            pass
            
    return default_config

def save_config(config):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {str(e)}")

# Initialize App State
st.set_page_config(page_title="KrishiMitra AI", page_icon="🌾", layout="wide")

# Use session state for configuration storage to prevent inter-user key leakages in deployed app
if "config" not in st.session_state:
    st.session_state.config = load_config()

config = st.session_state.config

# Set translation target language based on config selection
selected_lang_name = config.get("language", "English")
lang_info = LANG_MAP.get(selected_lang_name, LANG_MAP["English"])
target_lang_code = lang_info["code"]

# Static UI Translations for Telugu and Hindi to ensure 0ms rendering latency
STATIC_TRANSLATIONS = {
    "te": {
        "Dashboard": "డ్యాష్‌బోర్డ్",
        "Soil Analyzer": "నేల విశ్లేషణ",
        "Crop Recommendation": "పంట సిఫార్సు",
        "Disease Assistant": "తెగుళ్ల సహాయకుడు",
        "Voice Interaction": "వాయిస్ సంభాషణ",
        "Settings": "సెట్టింగులు",
        "Voice Interaction Assistant": "వాయిస్ సంభాషణ సహాయకుడు",
        "Ask a question in Telugu (or target language). The AI answers back both as text and speech output.": "తెలుగులో ప్రశ్న అడగండి. AI టెక్స్ట్ మరియు వాయిస్ రూపంలో సమాధానం ఇస్తుంది.",
        "Voice Input": "వాయిస్ ఇన్‌పుట్",
        "Press the button below, speak your agricultural question, and wait for analysis.": "క్రింది బటన్‌ను నొక్కి, మీ వ్యవసాయ ప్రశ్నను మాట్లాడండి.",
        "Click to Speak / Record": "మాట్లాడటానికి క్లిక్ చేయండి",
        "Stop Recording": "రికార్డింగ్ ఆపండి",
        "Or type your question:": "లేదా మీ ప్రశ్నను టైప్ చేయండి:",
        "Edit or type your question:": "మీ ప్రశ్నను టైప్ చేయండి లేదా సవరించండి:",
        "e.g. My chili crop leaves are turning yellow...": "ఉదా: నా మిరప తోట ఆకులు పసుపు రంగులోకి మారుతున్నాయి...",
        "Submit Question 🚀": "ప్రశ్నను సమర్పించండి 🚀",
        "KrishiMitra AI is formulating advice...": "కృషిమిత్ర AI సలహాను సిద్ధం చేస్తోంది...",
        "Synthesizing speech playback...": "వాయిస్ ప్లేబ్యాక్‌ని సిద్ధం చేస్తోంది...",
        "Conversation History": "సంభాషణ చరిత్ర",
        "Clear Conversation": "చరిత్రను క్లియర్ చేయి",
        "Farmer": "రైతు",
        "KrishiMitra AI": "కృషిమిత్ర AI",
        "Speak or type a question on the left to start the conversation with KrishiMitra AI.": "కృషిమిత్ర AI తో సంభాషణను ప్రారంభించడానికి ఎడమ వైపున మాట్లాడండి లేదా టైప్ చేయండి.",
        "Settings (BYOK & Configuration)": "సెట్టింగులు (కాన్ఫిగరేషన్)",
        "Configure your model providers, API keys, and language preferences. Stored locally.": "మీ మోడల్ ప్రొవైడర్లు, API కీలు మరియు భాషా ప్రాధాన్యతలను ఇక్కడ సెట్ చేయండి.",
        "Model Selection": "మోడల్ ఎంపిక",
        "Active Mode": "యాక్టివ్ మోడ్",
        "Cloud API Provider": "క్లౌడ్ API ప్రొవైడర్",
        "Language / భాష / భాష": "భాష / Language",
        "API Access (BYOK)": "API కీలు",
        "Gemini API Key": "Gemini API కీ",
        "Gemini Model Name": "Gemini మోడల్ పేరు",
        "Groq API Key": "Groq API కీ",
        "Local Model Config (Ollama)": "లోకల్ మోడల్ కాన్ఫిగరేషన్ (Ollama)",
        "Ollama Host URL": "Ollama హోస్ట్ URL",
        "Ollama Model Name": "Ollama మోడల్ పేరు",
        "Save Configuration": "కాన్ఫిగరేషన్‌ను సేవ్ చేయి",
        "Settings saved successfully! Reloading variables...": "సెట్టింగ్‌లు విజయవంతంగా సేవ్ చేయబడ్డాయి! లోడ్ అవుతోంది...",
        "Console Status": "కన్సోల్ స్థితి",
        "Diagnosis completed!": "రోగ నిర్ధారణ పూర్తయింది!",
        "AI Diagnosis Report": "AI రోగ నిర్ధారణ నివేదిక",
        "Upload an image on the left and click 'Diagnose Leaf Disease' to view the AI analysis report.": "ఆకు తెగులును గుర్తించడానికి ఎడమవైపున చిత్రాన్ని అప్‌లోడ్ చేసి 'రోగ నిర్ధారణ చేయి' క్లిక్ చేయండి.",
        "Upload Soil Report": "నేల నివేదికను అప్‌లోడ్ చేయి",
        "Soil Analyzer & Crop Compatibility": "నేల విశ్లేషణ & పంట అనుకూలత",
        "Upload a PDF or Image of your soil report to analyze nutrients and recommend crops.": "పోషకాలను విశ్లేషించడానికి మరియు పంటలను సిఫార్సు చేయడానికి మీ నేల పరీక్ష నివేదికను అప్‌లోడ్ చేయండి.",
        "Upload Soil Report (PDF/Image)": "నేల పరీక్ష నివేదికను అప్‌లోడ్ చేయండి",
        "Analyze Soil Report": "నేల నివేదికను విశ్లేషించు",
        "Analyzing soil report...": "నేల నివేదికను విశ్లేషిస్తోంది...",
        "Soil Analysis Report": "నేల విశ్లేషణ నివేదిక",
        "Upload a report to see the analysis.": "విశ్లేషణను చూడటానికి నివేదికను అప్‌లోడ్ చేయండి.",
        "Soil Health Indicators": "నేల ఆరోగ్య సూచికలు",
        "Select a crop to check soil compatibility:": "నేల అనుకూలతను తనిఖీ చేయడానికి ఒక పంటను ఎంచుకోండి:",
        "Crop Suitability & Requirements": "పంట అనుకూలత & అవసరాలు",
        "Please analyze a soil report first to view suitability.": "అనుకూలతను చూడటానికి దయచేసి మొదట నేల పరీక్ష నివేదికను విశ్లేషించండి.",
        "Crop Recommendation System": "పంట సిఫార్సు వ్యవస్థ",
        "Find the best crops to plant based on soil parameters.": "నేల పోషకాల ఆధారంగా పండించడానికి ఉత్తమమైన పంటలను కనుగొనండి.",
        "Crop Details": "పంట వివరాలు",
        "Leaf Disease Diagnostics": "ఆకు తెగులు నిర్ధారణ",
        "Take a photo or upload an image of a diseased crop leaf to get organic & chemical remedies.": "సేంద్రీయ & రసాయన నివారణలను పొందడానికి తెగులు సోకిన పంట ఆకు చిత్రాన్ని అప్‌లోడ్ చేయండి.",
        "Upload Leaf Image": "ఆకు చిత్రాన్ని అప్‌లోడ్ చేయి",
        "Diagnose Leaf Disease": "ఆకు తెగులు నిర్ధారణ చేయి",
        "Diagnosing leaf health...": "ఆకు ఆరోగ్యాన్ని విశ్లేషిస్తోంది...",
        "Crop Compatibility": "పంట అనుకూలత",
        "Compatibility": "అనుకూలత",
        "Parameters": "పారామితులు",
        "Optimal": "అనుకూలమైనది",
        "Low": "తక్కువ",
        "High": "ఎక్కువ"
    },
    "hi": {
        "Dashboard": "डैशबोर्ड",
        "Soil Analyzer": "मिट्टी विश्लेषक",
        "Crop Recommendation": "फसल अनुशंसा",
        "Disease Assistant": "रोग सहायक",
        "Voice Interaction": "आवाज बातचीत",
        "Settings": "सेटिंग्स",
        "Voice Interaction Assistant": "आवाज बातचीत सहायक",
        "Ask a question in Telugu (or target language). The AI answers back both as text and speech output.": "अपनी भाषा में प्रश्न पूछें। AI पाठ और आवाज दोनों में उत्तर देगा।",
        "Voice Input": "आवाज इनपुट",
        "Press the button below, speak your agricultural question, and wait for analysis.": "नीचे दिए गए बटन को दबाएं, अपनी कृषि संबंधी समस्या बोलें।",
        "Click to Speak / Record": "बोलने के लिए क्लिक करें",
        "Stop Recording": "रिकॉर्डिंग बंद करें",
        "Or type your question:": "या अपना प्रश्न टाइप करें:",
        "Edit or type your question:": "अपना प्रश्न टाइप करें या संपादन करें:",
        "e.g. My chili crop leaves are turning yellow...": "जैसे: मेरी मिर्च की फसल के पत्ते पीले पड़ रहे हैं...",
        "Submit Question 🚀": "प्रश्न जमा करें 🚀",
        "KrishiMitra AI is formulating advice...": "कृषिमित्र AI सलाह तैयार कर रहा है...",
        "Synthesizing speech playback...": "आवाज तैयार की जा रही है...",
        "Conversation History": "बातचीत का इतिहास",
        "Clear Conversation": "बातचीत मिटाएं",
        "Farmer": "किसान",
        "KrishiMitra AI": "कृषिमित्र AI",
        "Speak or type a question on the left to start the conversation with KrishiMitra AI.": "कृषिमित्र AI के साथ बातचीत शुरू करने के लिए बाईं ओर बोलें या टाइप करें।",
        "Settings (BYOK & Configuration)": "सेटिंग्स (कॉन्फ़िगरेशन)",
        "Configure your model providers, API keys, and language preferences. Stored locally.": "अपने मॉडल प्रदाता, API कुंजी और भाषा प्राथमिकताओं को कॉन्फ़िगर करें।",
        "Model Selection": "मॉडल चयन",
        "Active Mode": "सक्रिय मोड",
        "Cloud API Provider": "क्लाउड API प्रदाता",
        "Language / భాష / भाषा": "भाषा / Language",
        "API Access (BYOK)": "API कुंजी",
        "Gemini API Key": "Gemini API कुंजी",
        "Gemini Model Name": "Gemini मॉडल का नाम",
        "Groq API Key": "Groq API कुंजी",
        "Local Model Config (Ollama)": "स्थानीय मॉडल कॉन्फ़िगरेशन (Ollama)",
        "Ollama Host URL": "Ollama होस्ट URL",
        "Ollama Model Name": "Ollama मॉडल का नाम",
        "Save Configuration": "कॉन्फ़िगरेशन सहेजें",
        "Settings saved successfully! Reloading variables...": "सेटिंग्स सफलतापूर्वक सहेजी गईं! लोड हो रहा है...",
        "Console Status": "कंसोल स्थिति",
        "Diagnosis completed!": "निदान पूरा हुआ!",
        "AI Diagnosis Report": "AI निदान रिपोर्ट",
        "Upload an image on the left and click 'Diagnose Leaf Disease' to view the AI analysis report.": "निदान रिपोर्ट देखने के लिए बाईं ओर एक छवि अपलोड करें और 'निदान करें' पर क्लिक करें।",
        "Upload Soil Report": "मिट्टी की रिपोर्ट अपलोड करें",
        "Soil Analyzer & Crop Compatibility": "मिट्टी विश्लेषक और फसल संगतता",
        "Upload a PDF or Image of your soil report to analyze nutrients and recommend crops.": "पोषक तत्वों का विश्लेषण करने और फसलों की सिफारिश करने के लिए अपनी मिट्टी परीक्षण रिपोर्ट अपलोड करें।",
        "Upload Soil Report (PDF/Image)": "मिट्टी परीक्षण रिपोर्ट अपलोड करें",
        "Analyze Soil Report": "मिट्टी की रिपोर्ट का विश्लेषण करें",
        "Analyzing soil report...": "मिट्टी की रिपोर्ट का विश्लेषण किया जा रहा है...",
        "Soil Analysis Report": "मिट्टी विश्लेषण रिपोर्ट",
        "Upload a report to see the analysis.": "विश्लेषण देखने के लिए मिट्टी की रिपोर्ट अपलोड करें।",
        "Soil Health Indicators": "मिट्टी स्वास्थ्य संकेतक",
        "Select a crop to check soil compatibility:": "फसल अनुकूलता की जांच करने के लिए एक फसल चुनें:",
        "Crop Suitability & Requirements": "फसल उपयुक्तता और आवश्यकताएं",
        "Please analyze a soil report first to view suitability.": "अनुकूलता देखने के लिए कृपया पहले मिट्टी की रिपोर्ट का विश्लेषण करें।",
        "Crop Recommendation System": "फसल सिफारिश प्रणाली",
        "Find the best crops to plant based on soil parameters.": "मिट्टी के पोषक तत्वों के आधार पर लगाने के लिए सर्वोत्तम फसलों का पता लगाएं।",
        "Crop Details": "फसल का विवरण",
        "Leaf Disease Diagnostics": "पत्ती रोग निदान",
        "Take a photo or upload an image of a diseased crop leaf to get organic & chemical remedies.": "जैविक और रासायनिक उपचार प्राप्त करने के लिए प्रभावित पत्ती की छवि अपलोड करें।",
        "Upload Leaf Image": "पत्ती की छवि अपलोड करें",
        "Diagnose Leaf Disease": "पत्ती रोग का निदान करें",
        "Diagnosing leaf health...": "पत्ती के स्वास्थ्य का विश्लेषण किया जा रहा है...",
        "Crop Compatibility": "फसल संगतता",
        "Compatibility": "अनुकूलता",
        "Parameters": "पैरामीटर",
        "Optimal": "इष्टतम",
        "Low": "कम",
        "High": "अधिक"
    }
}

# Cache translated static text to prevent constant API calling
@st.cache_data
def get_translated_label(text, dest_lang):
    if dest_lang == 'en':
        return text
    # Check static dictionary first for instant 0ms rendering
    lang_dict = STATIC_TRANSLATIONS.get(dest_lang, {})
    if text in lang_dict:
        return lang_dict[text]
    # Fallback to translation API
    return translate_text(text, src_lang='en', dest_lang=dest_lang)

def L(text):
    """Translate UI text dynamically."""
    return get_translated_label(text, target_lang_code)

# Inject Premium Custom Styling
st.markdown("""
<style>
/* Import modern outfit and plus jakarta sans fonts */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

/* Main content text styling - Adapt to theme text color for perfect contrast in light and dark modes */
.main, .main .stMarkdown, .main p, .main span, .main li, .main label, .main h1, .main h2, .main h3, .main h4, .main h5, .main h6 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--text-color, #0f172a) !important;
}

/* Sidebar primary layout styling - Premium Dark Forest Green Theme */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #022c22 0%, #064e3b 100%) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
    min-width: 280px !important;
    max-width: 280px !important;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15) !important;
}

/* Force all text inside the sidebar to remain bright white or mint green, preventing black text overlays */
[data-testid="stSidebar"] *, [data-testid="stSidebar"] p, [data-testid="stSidebar"] span, [data-testid="stSidebar"] div, [data-testid="stSidebar"] label {
    color: #a7f3d0 !important;
    font-family: 'Plus Jakarta Sans', sans-serif;
}
[data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3, [data-testid="stSidebar"] strong {
    color: #ffffff !important;
}

/* Remove default sidebar header container whitespace and collapse button spacing */
[data-testid="stSidebarHeader"] {
    display: none !important;
}

[data-testid="collapsedSidebarCodegen"],
button[data-testid="stSidebarCollapseButton"] {
    display: none !important;
}

/* Inner content container - takes full height, zero margin, layout top-to-bottom */
[data-testid="stSidebarUserContent"] {
    background: transparent !important;
    padding: 24px 16px !important;
    margin: 0 !important;
    height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    overflow-y: auto !important;
}

/* Navigation radio styling specifically for vertical side menu links in the sidebar */
[data-testid="stSidebar"] div[data-testid="stRadio"] > div[role="radiogroup"] {
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
    gap: 8px !important;
    margin-top: 15px !important;
}

[data-testid="stSidebar"] div[data-testid="stRadio"] label {
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 12px 16px !important;
    border-radius: 10px !important;
    background-color: transparent !important;
    border: 1px solid transparent !important;
    border-left: 4px solid transparent !important;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
}

[data-testid="stSidebar"] div[data-testid="stRadio"] label p {
    color: #a7f3d0 !important; /* Default unselected: bright mint green */
    font-weight: 500 !important;
    font-size: 13.5px !important;
    margin: 0 !important;
    letter-spacing: 0.2px !important;
}

[data-testid="stSidebar"] div[data-testid="stRadio"] label:hover {
    background-color: rgba(255, 255, 255, 0.08) !important;
}

[data-testid="stSidebar"] div[data-testid="stRadio"] label:hover p {
    color: #ffffff !important; /* Hover state: bright white text */
}

/* Reflective glowing active state for sidebar links */
[data-testid="stSidebar"] div[data-testid="stRadio"] label:has(input:checked) {
    background: linear-gradient(90deg, rgba(52, 211, 153, 0.15) 0%, rgba(52, 211, 153, 0.05) 100%) !important;
    border-left: 4px solid #34d399 !important;
    border-color: transparent transparent transparent #34d399 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

[data-testid="stSidebar"] div[data-testid="stRadio"] label:has(input:checked) p {
    color: #ffffff !important; /* Checked state: bright active white */
    font-weight: 700 !important;
    text-shadow: 0 0 8px rgba(52, 211, 153, 0.5) !important; /* Reflective text glow */
}

/* Hide default radio circle completely for styled sidebar radios ONLY */
[data-testid="stSidebar"] div[data-testid="stRadio"] div[role="radiogroup"] label > div:first-of-type {
    display: none !important;
}
[data-testid="stSidebar"] div[data-testid="stRadio"] div[role="radiogroup"] label > div:nth-of-type(2) {
    padding-left: 0 !important;
    margin-left: 0 !important;
}

/* Monospace console status pulse animation */
@keyframes status-pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}

.pulse-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background-color: #34d399;
    border-radius: 50%;
    animation: status-pulse 2s infinite;
}

/* Settings Form radio menu alignment styling */
form div[data-testid="stRadio"] > div[role="radiogroup"] {
    display: flex !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    gap: 8px !important;
    margin-top: 4px !important;
}

/* Premium Frosted Glassmorphism Card style */
.farm-card {
    position: relative;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    padding: 28px 24px;
    border-radius: 20px;
    border: 1px solid rgba(16, 185, 129, 0.15) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05) !important;
    margin-bottom: 24px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.farm-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
}

.farm-card.card-soil::before {
    background: linear-gradient(90deg, #10b981 0%, #059669 100%) !important;
}
.farm-card.card-crop::before {
    background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%) !important;
}
.farm-card.card-disease::before {
    background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%) !important;
}

.farm-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(16, 185, 129, 0.12) !important;
    border-color: rgba(16, 185, 129, 0.2) !important;
}

/* Header Banner card */
.banner-container {
    background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #059669 100%);
    color: #ffffff;
    padding: 48px 40px;
    border-radius: 24px;
    margin-bottom: 35px;
    box-shadow: 0 12px 36px -8px rgba(5, 150, 105, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
}

.banner-container::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(52, 211, 153, 0.2) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
}

.banner-title {
    font-size: 38px;
    font-weight: 800;
    margin-bottom: 10px;
    letter-spacing: -1px;
    color: #ffffff !important;
    text-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.banner-subtitle {
    font-size: 17px;
    opacity: 0.95;
    color: #ecfdf5 !important;
    line-height: 1.6;
    max-width: 80%;
}

/* Responsive & Reflective Action Buttons styling */
div.stButton > button, div.stFormSubmitButton > button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    font-size: 14.5px !important;
    letter-spacing: 0.3px !important;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25) !important;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    text-transform: uppercase !important;
    position: relative !important;
    overflow: hidden !important;
    width: 100% !important;
    cursor: pointer !important;
}

/* Sliding sheen reflective element */
div.stButton > button::after, div.stFormSubmitButton > button::after {
    content: '' !important;
    position: absolute !important;
    top: 0 !important;
    left: -100% !important;
    width: 100% !important;
    height: 100% !important;
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.25) 50%,
        rgba(255, 255, 255, 0) 100%
    ) !important;
    transform: skewX(-25deg) !important;
    transition: none !important;
    pointer-events: none !important;
}

div.stButton > button:hover::after, div.stFormSubmitButton > button:hover::after {
    left: 100% !important;
    transition: all 0.75s ease-in-out !important;
}

div.stButton > button:hover, div.stFormSubmitButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.45) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
    color: white !important;
}

div.stButton > button:active, div.stFormSubmitButton > button:active {
    transform: translateY(1px) !important;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2) !important;
}

div.stButton > button:focus, div.stFormSubmitButton > button:focus {
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4) !important;
}

/* File Uploader styling */
[data-testid="stFileUploader"] {
    border: 2px dashed rgba(16, 185, 129, 0.25) !important;
    background-color: rgba(240, 253, 244, 0.4) !important;
    border-radius: 16px !important;
    padding: 24px !important;
    transition: all 0.25s ease !important;
}

[data-testid="stFileUploader"]:hover {
    border-color: #10b981 !important;
    background-color: rgba(240, 253, 244, 0.7) !important;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.05) !important;
}

[data-testid="stFileUploader"] section {
    background-color: transparent !important;
    border: none !important;
}

/* Text and Number Input styles - Adapt to theme backgrounds and colors */
div[data-baseweb="input"] {
    border-radius: 12px !important;
    border: 1px solid rgba(16, 185, 129, 0.15) !important;
    background-color: var(--background-color) !important;
    transition: all 0.2s ease !important;
    padding: 4px 8px !important;
}

div[data-baseweb="input"] input, div[data-baseweb="textarea"] textarea {
    color: var(--text-color) !important;
    -webkit-text-fill-color: var(--text-color) !important;
}

div[data-baseweb="input"]:focus-within {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
}

/* Select boxes - Fix contrast to prevent light-on-light text rendering bugs */
div[data-baseweb="select"] {
    border-radius: 12px !important;
    border: 1px solid rgba(16, 185, 129, 0.15) !important;
    background-color: var(--background-color) !important;
}

div[data-baseweb="select"] [data-testid="stSelectboxValue"] {
    color: var(--text-color) !important;
}

/* Explicit style for dropdown options inside selectbox listbox popovers */
div[role="listbox"] ul li, [data-baseweb="popover"] li {
    color: var(--text-color) !important;
    background-color: var(--background-color) !important;
    font-size: 14px !important;
}

div[role="listbox"] ul li:hover, [data-baseweb="popover"] li:hover {
    background-color: var(--secondary-background-color) !important;
    color: #10b981 !important;
}

/* Streamlit Tabs override */
button[data-baseweb="tab"] {
    font-weight: 600 !important;
    color: #64748b !important;
    border-bottom: 2px solid transparent !important;
    transition: all 0.2s ease !important;
    padding: 10px 16px !important;
}

button[data-baseweb="tab"]:hover {
    color: #10b981 !important;
}

button[data-baseweb="tab"][aria-selected="true"] {
    color: #10b981 !important;
    border-bottom-color: #10b981 !important;
}

/* Slider override */
[data-testid="stSlider"] [role="slider"] {
    background-color: #059669 !important;
    border: 2px solid white !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
}

[data-testid="stSlider"] div[data-baseweb="slider"] > div {
    background-color: #e2e8f0 !important;
}

/* Selected track highlight */
[data-testid="stSlider"] div[data-baseweb="slider"] > div > div > div {
    background-color: #10b981 !important;
}

/* Compatibility Gauge circle styling */
.gauge-ring {
    position: relative;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 17px;
    color: var(--text-color);
    background-color: var(--background-color);
    box-shadow: inset 0 0 0 5px var(--secondary-background-color);
}

.gauge-ring-green { border: 5px solid #10b981; }
.gauge-ring-amber { border: 5px solid #f59e0b; }
.gauge-ring-rose { border: 5px solid #f43f5e; }

/* Status tags */
.status-pill {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.status-pill-optimal { background-color: #d1fae5; color: #065f46; }
.status-pill-low { background-color: #fef3c7; color: #92400e; }
.status-pill-high { background-color: #ffedd5; color: #9a3412; }

/* Voice chat bubble styling */
.chat-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 10px 0;
}

.chat-bubble {
    padding: 16px 20px;
    border-radius: 20px;
    max-width: 85%;
    font-size: 14.5px;
    line-height: 1.5;
    box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05);
    margin-bottom: 8px;
    position: relative;
}

.chat-bubble-user {
    align-self: flex-end;
    background-color: rgba(3, 105, 161, 0.15) !important;
    color: var(--text-color) !important;
    border-bottom-right-radius: 4px;
    border: 1px solid rgba(3, 105, 161, 0.25) !important;
}

.chat-bubble-ai {
    align-self: flex-start;
    background-color: var(--background-color) !important;
    color: var(--text-color) !important;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(16, 185, 129, 0.25) !important;
}

/* Style headers inside expenders or subheaders */
h4, h5, h6 {
    color: var(--text-color);
    font-weight: 700;
}

/* Forms styling - Force theme-based background and elegant borders to resolve dark theme contrast conflict */
div[data-testid="stForm"] {
    background-color: var(--secondary-background-color) !important;
    border: 1px solid rgba(16, 185, 129, 0.15) !important;
    border-radius: 20px !important;
    padding: 28px 24px !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05) !important;
}

/* Expanders styling - Force theme-based background and elegant borders to resolve dark theme contrast conflict */
div[data-testid="stExpander"] {
    background-color: var(--secondary-background-color) !important;
    border: 1px solid rgba(16, 185, 129, 0.15) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02) !important;
}

/* Ensure notifications (alerts) have readable text colors */
div[data-testid="stNotification"] p, div[data-testid="stNotification"] span, div[data-testid="stNotification"] label {
    color: inherit !important;
}
</style>
""", unsafe_allow_html=True)

# Helper function to parse soil report JSON parameters
def parse_soil_analyzer_response(ai_text):
    json_match = re.search(r'```json\s*(\{.*?\})\s*```', ai_text, re.DOTALL)
    if not json_match:
        json_match = re.search(r'(\{.*?\})', ai_text, re.DOTALL)
        
    extracted_data = {}
    cleaned_text = ai_text
    
    if json_match:
        try:
            extracted_data = json.loads(json_match.group(1))
            cleaned_text = ai_text.replace(json_match.group(0), "").strip()
        except Exception:
            pass
            
    return extracted_data, cleaned_text

# Define Crop Matching Parameter Bar HTML
def draw_parameter_bar(label, actual, min_val, max_val, ideal_min, ideal_max, unit, status):
    def pct(v):
        return min(100, max(0, ((v - min_val) / (max_val - min_val)) * 100))
    
    act_pct = pct(actual)
    id_min_pct = pct(ideal_min)
    id_max_pct = pct(ideal_max)
    range_width = id_max_pct - id_min_pct
    
    color_map = {
        "Optimal": "#10b981", # green
        "Low": "#f59e0b",     # amber
        "High": "#f97316"     # orange
    }
    marker_color = color_map.get(status, "#ef4444")
    
    html = f"""
    <div style="margin-bottom: 18px; font-family: inherit; font-size: 13px; background: rgba(248, 250, 252, 0.6); padding: 10px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600; margin-bottom: 6px;">
            <span style="color: #334155; font-size: 14px;">{label}</span>
            <span style="color: #475569; font-size: 12px;">Actual: <span style="color: {marker_color}; font-weight: 800; padding: 2px 6px; background-color: {marker_color}15; border-radius: 6px;">{actual}{unit}</span> <span style="color: #64748b; font-weight: normal; font-size: 11px; margin-left: 4px;">(Ideal: {ideal_min}-{ideal_max}{unit})</span></span>
        </div>
        <div style="position: relative; width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 4px;">
            <div style="position: absolute; left: {id_min_pct}%; width: {range_width}%; height: 100%; background: linear-gradient(90deg, #a7f3d0 0%, #10b981 100%); opacity: 0.65; border-radius: 2px;"></div>
            <div style="position: absolute; left: {act_pct}%; top: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; background-color: {marker_color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px {marker_color}; z-index: 2; transition: all 0.3s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 500;">
            <span>{min_val}{unit}</span>
            <span>{max_val}{unit}</span>
        </div>
    </div>
    """
    return html

# Handle query parameters for page navigation
pages_list = ["Dashboard", "Soil Analyzer", "Crop Recommendation", "Disease Assistant", "Voice Interaction", "Settings"]

if "nav_radio" not in st.session_state:
    st.session_state.nav_radio = "Dashboard"

if "page" in st.query_params:
    qp_page = st.query_params.get("page")
    if qp_page in pages_list:
        st.session_state.nav_radio = qp_page
        # Clear query parameters to prevent sticky page redirection
        st.query_params.clear()

# Render Sidebar Navigation Panel (Fixed 100vh Workspace Sidebar)
with st.sidebar:
    # Sidebar Header: Left-aligned, compact, modern workspace style
    h_col1, h_col2 = st.columns([1.2, 4.8])
    with h_col1:
        st.image("logo.png", width=36)
    with h_col2:
        st.markdown("<h3 style='margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.2; margin-top: 2px;'>KrishiMitra AI</h3><p style='margin: 0; font-size: 9.5px; color: #34d399; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px;'>Farming Console</p>", unsafe_allow_html=True)

    st.markdown("<hr style='margin-top: 12px; margin-bottom: 12px; border: 0; border-top: 1px solid rgba(16, 185, 129, 0.15);'>", unsafe_allow_html=True)
    
    # Navigation items mapped to their clear icons
    NAV_ICONS = {
        "Dashboard": "📊 Dashboard",
        "Soil Analyzer": "🧪 Soil Analyzer",
        "Crop Recommendation": "🌾 Crop Recommendation",
        "Disease Assistant": "🍂 Disease Assistant",
        "Voice Interaction": "🎙️ Voice Interaction",
        "Settings": "⚙️ Settings"
    }
    
    page = st.radio(
        "Navigation",
        pages_list,
        horizontal=False,
        label_visibility="collapsed",
        format_func=lambda x: NAV_ICONS.get(x, x),
        key="nav_radio"
    )
    st.session_state.page = page
    
    # Spacer to push console stats to the bottom
    st.markdown("<div style='flex-grow: 1; min-height: 100px;'></div>", unsafe_allow_html=True)
    
    # System Status & Info at the bottom of the sidebar
    provider_name = config['cloud_provider'] if config['mode'] == 'Cloud' else config['ollama_model']
    st.markdown(f"""
    <div style="background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 12px; font-size: 11px; color: #a7f3d0; font-family: sans-serif; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #34d399; margin-bottom: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;">
            <span class="pulse-dot"></span>
            Console Status
        </div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;"><span style="color: #34d399; opacity: 0.8;">[mode]</span> <span style="font-weight: 600; color: #ffffff;">{config['mode']}</span></div>
        <div style="margin-bottom: 4px; display: flex; justify-content: space-between;"><span style="color: #34d399; opacity: 0.8;">[model]</span> <span style="font-weight: 600; color: #ffffff;">{provider_name}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #34d399; opacity: 0.8;">[lang]</span> <span style="font-weight: 600; color: #ffffff;">{selected_lang_name}</span></div>
    </div>
    """, unsafe_allow_html=True)

# 1. SETTINGS PAGE
if page == "Settings":
    st.title("⚙️ Settings (BYOK & Configuration)")
    st.write("Configure your model providers, API keys, and language preferences.")
    
    is_deployed = (
        os.environ.get("STREAMLIT_SHARING_AUTHOR") is not None or 
        os.environ.get("RENDER") is not None or 
        os.environ.get("RAILWAY_STATIC_URL") is not None or
        os.environ.get("PORT") is not None or
        os.environ.get("STREAMLIT_SERVER_HEADLESS") == "true"
    )
    
    if is_deployed:
        st.info("ℹ️ **Running in Deployed Mode (BYOK)**: To protect your privacy, configuration changes are saved in your browser's current tab session only. They will not be saved on the server disk or shared with other users.")
    else:
        st.write("Stored locally in configuration file.")
        
    with st.form("settings_form"):
        col1, col2 = st.columns(2)
        with col1:
            st.subheader("Model Selection")
            mode = st.radio("Active Mode", ["Cloud", "Local (Ollama)"], index=0 if config["mode"] == "Cloud" else 1)
            cloud_provider = st.selectbox("Cloud API Provider", ["Gemini", "Groq"], index=0 if config["cloud_provider"] == "Gemini" else 1)
            language = st.selectbox("Language / భాష / భాష", ["English", "Telugu", "Hindi"], index=["English", "Telugu", "Hindi"].index(selected_lang_name))
            
        with col2:
            st.subheader("API Access (BYOK)")
            gemini_key = st.text_input("Gemini API Key", value=config.get("gemini_key", ""), type="password")
            st.caption("Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/)")
            gemini_model = st.text_input("Gemini Model Name", value=config.get("gemini_model", "gemini-1.5-flash"))
            groq_key = st.text_input("Groq API Key", value=config.get("groq_key", ""), type="password")
            st.caption("Get a Groq API key from [Groq Console](https://console.groq.com/)")
            
            st.subheader("Local Model Config (Ollama)")
            ollama_host = st.text_input("Ollama Host URL", value=config.get("ollama_host", "http://localhost:11434"))
            ollama_model = st.text_input("Ollama Model Name", value=config.get("ollama_model", "llama3.2"))
            
        submitted = st.form_submit_button("Save Configuration")
        if submitted:
            new_config = {
                "mode": "Cloud" if mode == "Cloud" else "Local",
                "cloud_provider": cloud_provider,
                "gemini_key": gemini_key,
                "groq_key": groq_key,
                "gemini_model": gemini_model,
                "ollama_host": ollama_host,
                "ollama_model": ollama_model,
                "language": language
            }
            st.session_state.config = new_config
            if not is_deployed:
                save_config(new_config)
                
            # Set cookies on browser via a hidden image onerror injection to persist key (for old/returning users)
            cookie_js = ""
            for k, v in new_config.items():
                safe_val = str(v).replace("'", "\\'")
                if not safe_val:
                    cookie_js += f"document.cookie = '{k}=;path=/;max-age=0;SameSite=Strict';"
                else:
                    cookie_js += f"document.cookie = '{k}={safe_val};path=/;max-age=31536000;SameSite=Strict';"
            
            st.markdown(f'<img src="x" onerror="{cookie_js}" style="display:none;">', unsafe_allow_html=True)
            
            st.success("Settings saved successfully! Reloading variables...")
            st.rerun()

# Crop requirement data for Ported Crop Recommendation
CROP_DATABASE = [
    {
        'name': 'Rice (Paddy)', 'seasons': ['Kharif', 'Monsoon'],
        'ph': (5.5, 7.0), 'n': (80, 120), 'p': (40, 60), 'k': (40, 60), 'om': (2.0, 5.0), 'moisture': (45, 80),
        'duration': '120-150 days', 'yield': '3.5-6.0 tons/ha', 'varieties': ['IR64', 'Basmati 370', 'Swarna'],
        'care': ['Maintain standing water of 2-5 cm.', 'Apply nitrogen in splits.'], 'locations': ['West Bengal', 'Punjab', 'Uttar Pradesh', 'Tamil Nadu', 'Andhra Pradesh']
    },
    {
        'name': 'Wheat', 'seasons': ['Rabi', 'Winter'],
        'ph': (6.0, 7.5), 'n': (100, 140), 'p': (50, 70), 'k': (40, 60), 'om': (1.5, 3.5), 'moisture': (25, 40),
        'duration': '110-140 days', 'yield': '4.0-5.5 tons/ha', 'varieties': ['HD 2967', 'Karan Vandana', 'PBW 343'],
        'care': ['Sow at 4-5 cm depth.', 'Critical irrigation at Crown Root stage.'], 'locations': ['Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh']
    },
    {
        'name': 'Maize (Corn)', 'seasons': ['Kharif', 'Rabi', 'Zaid'],
        'ph': (5.8, 7.2), 'n': (90, 120), 'p': (40, 60), 'k': (40, 60), 'om': (2.0, 4.5), 'moisture': (25, 45),
        'duration': '90-110 days', 'yield': '5.0-7.5 tons/ha', 'varieties': ['Ganga 11', 'Prakash', 'Bio 9681'],
        'care': ['Avoid waterlogging.', 'Apply Zinc sulfate for deficiency.'], 'locations': ['Karnataka', 'Madhya Pradesh', 'Bihar', 'Telangana']
    },
    {
        'name': 'Cotton', 'seasons': ['Kharif'],
        'ph': (6.0, 8.0), 'n': (80, 100), 'p': (30, 50), 'k': (40, 60), 'om': (1.0, 3.0), 'moisture': (20, 35),
        'duration': '150-180 days', 'yield': '2.0-3.5 tons/ha', 'varieties': ['Bt Cotton', 'MCU-5', 'Digvijay'],
        'care': ['Requires frost-free warm season.', 'Suited to black clay soils.'], 'locations': ['Gujarat', 'Maharashtra', 'Telangana']
    },
    {
        'name': 'Tomato', 'seasons': ['Kharif', 'Rabi', 'Zaid'],
        'ph': (6.0, 7.0), 'n': (60, 90), 'p': (60, 80), 'k': (80, 120), 'om': (2.5, 5.0), 'moisture': (30, 50),
        'duration': '110-130 days', 'yield': '20-40 tons/ha', 'varieties': ['Pusa Ruby', 'Arka Vikas', 'Abhinav'],
        'care': ['Keep soil consistently moist.', 'Provide strong stake support.'], 'locations': ['Andhra Pradesh', 'Karnataka', 'Madhya Pradesh']
    },
    {
        'name': 'Potato', 'seasons': ['Rabi'],
        'ph': (5.2, 6.5), 'n': (120, 150), 'p': (80, 100), 'k': (100, 150), 'om': (2.0, 4.5), 'moisture': (30, 45),
        'duration': '90-120 days', 'yield': '25-35 tons/ha', 'varieties': ['Kufri Jyoti', 'Kufri Bahar', 'Kufri Pukhraj'],
        'care': ['Maintain loose sandy loam soil.', 'Earth up stems at 30 days.'], 'locations': ['Uttar Pradesh', 'West Bengal', 'Bihar']
    },
    {
        'name': 'Soybean', 'seasons': ['Kharif'],
        'ph': (6.0, 7.0), 'n': (20, 40), 'p': (60, 80), 'k': (40, 60), 'om': (1.5, 3.5), 'moisture': (25, 40),
        'duration': '100-120 days', 'yield': '2.0-3.0 tons/ha', 'varieties': ['JS 335', 'JS 95-60', 'NRC 37'],
        'care': ['Inoculate seed with Rhizobium.', 'Perform weeding early.'], 'locations': ['Madhya Pradesh', 'Maharashtra', 'Rajasthan']
    },
    {
        'name': 'Mustard', 'seasons': ['Rabi'],
        'ph': (6.0, 7.5), 'n': (60, 80), 'p': (30, 45), 'k': (20, 40), 'om': (1.0, 3.0), 'moisture': (15, 30),
        'duration': '110-130 days', 'yield': '1.5-2.5 tons/ha', 'varieties': ['Pusa Bold', 'Kranti', 'Giriraj'],
        'care': ['Apply sulphur/gypsum for oil.', 'Thin crops at 15 days.'], 'locations': ['Rajasthan', 'Haryana', 'Madhya Pradesh']
    },
    {
        'name': 'Groundnut', 'seasons': ['Kharif', 'Zaid'],
        'ph': (6.0, 7.0), 'n': (20, 35), 'p': (40, 60), 'k': (35, 50), 'om': (1.5, 3.5), 'moisture': (20, 35),
        'duration': '105-125 days', 'yield': '2.0-3.2 tons/ha', 'varieties': ['GG 20', 'TG 37A', 'JL 24'],
        'care': ['Apply Gypsum at pegging.', 'Needs light sandy loam soil.'], 'locations': ['Gujarat', 'Andhra Pradesh', 'Tamil Nadu']
    },
    {
        'name': 'Sugarcane', 'seasons': ['Kharif', 'Rabi'],
        'ph': (6.0, 7.5), 'n': (150, 250), 'p': (60, 90), 'k': (80, 130), 'om': (2.5, 6.0), 'moisture': (45, 70),
        'duration': '300-360 days', 'yield': '70-100 tons/ha', 'varieties': ['Co 0238', 'Co 86032', 'Co 0118'],
        'care': ['Tie stalks to prevent falling.', 'Conserve moisture with trash mulch.'], 'locations': ['Uttar Pradesh', 'Maharashtra', 'Karnataka']
    }
]

# 2. DASHBOARD PAGE
if page == "Dashboard":
    # Banner
    st.markdown(f"""
    <div class="banner-container">
        <div class="banner-title">🌾 {L("KrishiMitra AI")}</div>
        <div class="banner-subtitle">
            {L("An AI-powered agricultural helper providing real-time soil, crop diagnostics, and voice consulting.")}
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.header(L("Quick Tools"))
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(f"""
        <a href="?page=Soil+Analyzer" target="_self" style="text-decoration: none; color: inherit;">
            <div class="farm-card card-soil" style="cursor: pointer;">
                <h3 style="margin-top:0; color:#059669;">🧪 {L("Soil Analyzer")}</h3>
                <p style="font-size:14px; color:#4b5563;">
                    {L("Upload images or PDF soil testing documents. The AI parses parameters and highlights deficiencies.")}
                </p>
            </div>
        </a>
        """, unsafe_allow_html=True)
            
    with col2:
        st.markdown(f"""
        <a href="?page=Crop+Recommendation" target="_self" style="text-decoration: none; color: inherit;">
            <div class="farm-card card-crop" style="cursor: pointer;">
                <h3 style="margin-top:0; color:#2563eb;">🌾 {L("Crop Recommend")}</h3>
                <p style="font-size:14px; color:#4b5563;">
                    {L("Enter chemical metrics, season, and regional locations to compute compatibility for 10 common crops.")}
                </p>
            </div>
        </a>
        """, unsafe_allow_html=True)
            
    with col3:
        st.markdown(f"""
        <a href="?page=Disease+Assistant" target="_self" style="text-decoration: none; color: inherit;">
            <div class="farm-card card-disease" style="cursor: pointer;">
                <h3 style="margin-top:0; color:#ea580c;">🍂 {L("Disease Assistant")}</h3>
                <p style="font-size:14px; color:#4b5563;">
                    {L("Take a photo of an infected leaf. Get diagnostic reports, primary causes, and tailored remedies.")}
                </p>
            </div>
        </a>
        """, unsafe_allow_html=True)

# 3. SOIL ANALYZER PAGE
elif page == "Soil Analyzer":
    st.title(f"🧪 {L('Soil Report Analyzer')}")
    st.write(L("Upload your soil test report (Image or PDF) to receive AI diagnostics in your preferred language."))
    
    col1, col2 = st.columns([5, 7])
    with col1:
        st.markdown(f"<div class='farm-card'><h4>{L('Upload Soil Report')}</h4>", unsafe_allow_html=True)
        uploaded_file = st.file_uploader(L("Upload Soil Report"), type=["pdf", "png", "jpg", "jpeg"], label_visibility="collapsed")
        
        if uploaded_file is not None:
            file_bytes = uploaded_file.read()
            file_name = uploaded_file.name
            file_type = uploaded_file.type
            
            if "pdf" in file_type:
                st.info(f"📄 {file_name} {L('loaded. PDF format ready for analysis.')}")
            else:
                image = Image.open(io.BytesIO(file_bytes))
                st.image(image, caption=L("Uploaded Soil Report"), use_container_width=True)
                
            if st.button(L("Analyze Report")):
                with st.spinner(L("AI is parsing soil parameters and generating report...")):
                    response = analyze_soil_report_ai(file_bytes, file_name, file_type, config)
                    
                    if "Error" in response:
                        st.error(response)
                    else:
                        extracted_data, report_text = parse_soil_analyzer_response(response)
                        
                        # Generate Hindi and Telugu translations on-the-fly
                        with st.spinner("Generating Telugu translation..."):
                            report_te = translate_text(report_text, src_lang='en', dest_lang='te')
                        with st.spinner("Generating Hindi translation..."):
                            report_hi = translate_text(report_text, src_lang='en', dest_lang='hi')
                            
                        st.session_state.last_soil_data = extracted_data
                        st.session_state.soil_report_en = report_text
                        st.session_state.soil_report_te = report_te
                        st.session_state.soil_report_hi = report_hi
                        
                        # Fallback for old state key
                        st.session_state.soil_report_text = report_text
                        
                        st.success(L("Analysis completed!"))
                        st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)
                        
    with col2:
        st.markdown(f"<div class='farm-card'><h4>{L('Analysis Diagnostics')}</h4>", unsafe_allow_html=True)
        if "soil_report_en" in st.session_state or "last_soil_data" in st.session_state:
            if "last_soil_data" in st.session_state and st.session_state.last_soil_data:
                extracted_data = st.session_state.last_soil_data
                st.markdown(f"<h5>🔹 {L('Extracted Soil Parameters')}</h5>", unsafe_allow_html=True)
                
                c1, c2, c3 = st.columns(3)
                c1.metric("pH", extracted_data.get("ph_level", "N/A"))
                c2.metric("Nitrogen (N)", f"{extracted_data.get('nitrogen', 'N/A')} kg/ha")
                c3.metric("Phosphorus (P)", f"{extracted_data.get('phosphorus', 'N/A')} kg/ha")
                
                c4, c5, c6 = st.columns(3)
                c4.metric("Potassium (K)", f"{extracted_data.get('potassium', 'N/A')} kg/ha")
                c5.metric("Organic Matter", f"{extracted_data.get('organic_matter', 'N/A')}%")
                c6.metric("Moisture", f"{extracted_data.get('moisture', 'N/A')}%")
                
                st.markdown("---")
                
            if "soil_report_en" in st.session_state:
                st.markdown(f"<h5>🔹 {L('Detailed Diagnostic Report')}</h5>", unsafe_allow_html=True)
                tab_en, tab_te, tab_hi = st.tabs(["🇬🇧 English", "🌾 తెలుగు (Telugu)", "🌾 हिंदी (Hindi)"])
                with tab_en:
                    st.markdown(st.session_state.soil_report_en)
                with tab_te:
                    st.markdown(st.session_state.soil_report_te)
                with tab_hi:
                    st.markdown(st.session_state.soil_report_hi)
        else:
            st.info(L("Upload a soil report on the left and click 'Analyze Report' to view diagnostics."))
        st.markdown("</div>", unsafe_allow_html=True)

# 4. CROP RECOMMENDATION PAGE
elif page == "Crop Recommendation":
    st.title(f"🌾 {L('Crop Recommendation Engine')}")
    st.write(L("Input chemical/physical soil metrics to match crop compatibility scores."))
    
    # Load parameters button
    if "last_soil_data" in st.session_state:
        if st.button(L("Load from Latest Soil Report Analysis")):
            d = st.session_state.last_soil_data
            st.session_state.c_ph = d.get("ph_level", 6.5)
            st.session_state.c_n = d.get("nitrogen", 45.0)
            st.session_state.c_p = d.get("phosphorus", 30.0)
            st.session_state.c_k = d.get("potassium", 120.0)
            st.session_state.c_om = d.get("organic_matter", 2.5)
            st.session_state.c_moisture = d.get("moisture", 35.0)
            st.success(L("Report data populated successfully!"))
            
    col1, col2 = st.columns([5, 7])
    
    # Defaults setting
    d_ph = st.session_state.get("c_ph", 6.5)
    d_n = st.session_state.get("c_n", 45)
    d_p = st.session_state.get("c_p", 30)
    d_k = st.session_state.get("c_k", 120)
    d_om = st.session_state.get("c_om", 2.5)
    d_moisture = st.session_state.get("c_moisture", 35)
    
    with col1:
        st.subheader(L("Soil Metrics"))
        ph = st.slider("Soil pH", 0.0, 14.0, float(d_ph), 0.1)
        nitrogen = st.slider("Nitrogen (N) (kg/ha)", 0, 300, int(d_n))
        phosphorus = st.slider("Phosphorus (P) (kg/ha)", 0, 300, int(d_p))
        potassium = st.slider("Potassium (K) (kg/ha)", 0, 300, int(d_k))
        organic_matter = st.slider("Organic Matter (%)", 0.0, 10.0, float(d_om), 0.1)
        moisture = st.slider("Moisture Content (%)", 0, 100, int(d_moisture))
        
        st.subheader(L("Environmental Factors"))
        location = st.text_input(L("Farm Location (e.g. Punjab, Gujarat)"), value="")
        season = st.selectbox(L("Target Season"), ["All", "Kharif", "Rabi", "Zaid"])
        
    with col2:
        st.subheader(L("Matched Crops"))
        
        # Crop Recommendation Calculation Algorithm
        matched_crops = []
        for crop in CROP_DATABASE:
            # Multi-criteria scoring
            def get_param_score(actual, limits, margin=0.5):
                c_min, c_max = limits
                if actual >= c_min and actual <= c_max:
                    return 1.0, "Optimal"
                if actual < c_min:
                    score = 1.0 - min(1.0, (c_min - actual) / (c_min * margin))
                    return score, "Low"
                else:
                    score = 1.0 - min(1.0, (actual - c_max) / (c_max * margin))
                    return score, "High"
                    
            ph_s, ph_status = get_param_score(ph, crop['ph'], 0.3)
            n_s, n_status = get_param_score(nitrogen, crop['n'], 0.6)
            p_s, p_status = get_param_score(phosphorus, crop['p'], 0.6)
            k_s, k_status = get_param_score(potassium, crop['k'], 0.6)
            om_s, om_status = get_param_score(organic_matter, crop['om'], 0.8)
            moist_s, moist_status = get_param_score(moisture, crop['moisture'], 0.6)
            
            # Season matching
            season_match = (season == "All") or any(s.lower() == season.lower() for s in crop['seasons'])
            
            # Location matching
            loc_match = (not location.strip()) or any(
                loc.lower() in location.strip().lower() or location.strip().lower() in loc.lower() 
                for loc in crop['locations']
            )
            
            # Weighted average score (pH: 20%, N/P/K: 15% each, Moisture: 15%, OM: 10%, Location: 10%)
            soil_score = (
                ph_s * 0.20 + n_s * 0.15 + p_s * 0.15 + k_s * 0.15 +
                moist_s * 0.15 + om_s * 0.10 + (1.0 if loc_match else 0.4) * 0.10
            ) * 100
            
            # 50% Season penalty
            if not season_match:
                soil_score *= 0.5
                
            score = round(soil_score)
            
            # Generate Fertilizer suggestions
            tips = []
            if ph_status == "Low":
                tips.append(f"pH is low ({ph}). Add agricultural lime to reach optimal {crop['ph'][0]}-{crop['ph'][1]}.")
            elif ph_status == "High":
                tips.append(f"pH is high ({ph}). Add sulfur or organic mulch to lower to {crop['ph'][0]}-{crop['ph'][1]}.")
                
            if n_status == "Low":
                tips.append(f"Nitrogen is deficient. Apply urea/ammonium sulfate to increase N.")
            if p_status == "Low":
                tips.append(f"Phosphorus is deficient. Apply SSP/DAP to enhance root growth.")
            if k_status == "Low":
                tips.append(f"Potassium is deficient. Apply MOP to enhance disease resistance.")
                
            matched_crops.append({
                "crop": crop,
                "score": score,
                "season_match": season_match,
                "loc_match": loc_match,
                "tips": tips,
                "breakdown": {
                    "ph": (ph, crop['ph'][0], crop['ph'][1], ph_status),
                    "n": (nitrogen, crop['n'][0], crop['n'][1], n_status),
                    "p": (phosphorus, crop['p'][0], crop['p'][1], p_status),
                    "k": (potassium, crop['k'][0], crop['k'][1], k_status),
                    "om": (organic_matter, crop['om'][0], crop['om'][1], om_status),
                    "moisture": (moisture, crop['moisture'][0], crop['moisture'][1], moist_status)
                }
            })
            
        matched_crops.sort(key=lambda x: x["score"], reverse=True)
        
        # Display list of recommendations
        for item in matched_crops:
            crop_name = L(item["crop"]["name"])
            duration_lbl = L("Duration")
            yield_lbl = L("Yield Potential")
            varieties_lbl = L("Varieties")
            care_lbl = L("Care Guidelines")
            chem_lbl = L("Chemical Range Check")
            
            score_color_class = "gauge-ring-green" if item["score"] >= 85 else ("gauge-ring-amber" if item["score"] >= 60 else "gauge-ring-rose")
            
            with st.expander(f"{crop_name} - {item['score']}% {L('Match')}"):
                c_col1, c_col2 = st.columns([2, 8])
                with c_col1:
                    st.markdown(f"""
                    <div class="gauge-ring {score_color_class}">
                        {item['score']}%
                    </div>
                    """, unsafe_allow_html=True)
                with c_col2:
                    st.write(f"**{L('Seasons')}**: {', '.join(L(s) for s in item['crop']['seasons'])}")
                    st.write(f"**{duration_lbl}**: {item['crop']['duration']}")
                    st.write(f"**{yield_lbl}**: {item['crop']['yield']}")
                    
                st.markdown(f"**{chem_lbl}**")
                for key, data in item["breakdown"].items():
                    label_map = {"ph": "pH", "n": "Nitrogen", "p": "Phosphorus", "k": "Potassium", "om": "Organic Matter", "moisture": "Moisture"}
                    unit_map = {"ph": "", "n": " kg/ha", "p": " kg/ha", "k": " kg/ha", "om": "%", "moisture": "%"}
                    max_limits = {"ph": 14.0, "n": 300.0, "p": 200.0, "k": 300.0, "om": 10.0, "moisture": 100.0}
                    
                    st.markdown(draw_parameter_bar(
                        L(label_map[key]), data[0], 0.0, max_limits[key], data[1], data[2], unit_map[key], data[3]
                    ), unsafe_allow_html=True)
                    
                if not item["loc_match"] and location.strip():
                    st.warning(f"⚠️ {L('Crop is not traditionally cultivated in')} {location}. {L('Suitable areas')}: {', '.join(item['crop']['locations'])}")
                    
                if item["tips"]:
                    st.info("**" + L("Fertilizer Recommendations") + "**:\n" + "\n".join(f"- {L(t)}" for t in item["tips"]))
                else:
                    st.success(L("Soil ranges are perfect! No adjustments needed."))
                    
                st.write(f"**{varieties_lbl}**: {', '.join(item['crop']['varieties'])}")
                st.write(f"**{care_lbl}**:")
                for tip in item["crop"]["care"]:
                    st.write(f"- {L(tip)}")

# 5. DISEASE ASSISTANT PAGE
elif page == "Disease Assistant":
    st.title(f"🍂 {L('Disease Assistant')}")
    st.write(L("Upload a plant leaf image to analyze infections, primary causes, and organic/chemical remedies."))
    
    col1, col2 = st.columns([5, 7])
    with col1:
        st.markdown(f"<div class='farm-card'><h4>{L('Upload Leaf Image')}</h4>", unsafe_allow_html=True)
        uploaded_image = st.file_uploader(L("Upload Leaf Image"), type=["png", "jpg", "jpeg"], label_visibility="collapsed")
        
        if uploaded_image is not None:
            file_bytes = uploaded_image.read()
            
            # Immediately validate leaf image
            is_leaf, reason = is_leaf_image_py(file_bytes)
            
            if not is_leaf:
                st.error(L("NOT AN LEAF, PLS UPLOAD LEAF IMAGES ONLY"))
                # Clear previous reports from session state
                if "disease_report_en" in st.session_state:
                    del st.session_state.disease_report_en
                if "disease_report_te" in st.session_state:
                    del st.session_state.disease_report_te
                if "disease_report_hi" in st.session_state:
                    del st.session_state.disease_report_hi
                if "disease_report_text" in st.session_state:
                    del st.session_state.disease_report_text
            else:
                image = Image.open(io.BytesIO(file_bytes))
                st.image(image, caption=L("Uploaded Leaf"), use_container_width=True)
                
                if st.button(L("Diagnose Leaf Disease")):
                    with st.spinner(L("Analyzing leaf health diagnostic markers...")):
                        response = diagnose_leaf_disease_ai(file_bytes, config)
                        
                        cleaned_resp = response.strip().strip('"').strip("'")
                        if "Error" in response:
                            st.error(response)
                        elif "NOT AN LEAF" in cleaned_resp or "UPLOAD LEAF IMAGES ONLY" in cleaned_resp:
                            st.error(L("NOT AN LEAF, PLS UPLOAD LEAF IMAGES ONLY"))
                            if "disease_report_en" in st.session_state:
                                del st.session_state.disease_report_en
                            if "disease_report_te" in st.session_state:
                                del st.session_state.disease_report_te
                            if "disease_report_hi" in st.session_state:
                                del st.session_state.disease_report_hi
                            if "disease_report_text" in st.session_state:
                                del st.session_state.disease_report_text
                        else:
                            with st.spinner("Generating Telugu translation..."):
                                report_te = translate_text(response, src_lang='en', dest_lang='te')
                            with st.spinner("Generating Hindi translation..."):
                                report_hi = translate_text(response, src_lang='en', dest_lang='hi')
                            
                            st.session_state.disease_report_en = response
                            st.session_state.disease_report_te = report_te
                            st.session_state.disease_report_hi = report_hi
                            
                            # Fallback
                            st.session_state.disease_report_text = response
                            
                            st.success(L("Diagnosis completed!"))
                            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)
                        
    with col2:
        st.markdown(f"<div class='farm-card'><h4>{L('AI Diagnosis Report')}</h4>", unsafe_allow_html=True)
        if "disease_report_en" in st.session_state:
            tab_en, tab_te, tab_hi = st.tabs(["🇬🇧 English", "🌾 తెలుగు (Telugu)", "🌾 हिंदी (Hindi)"])
            with tab_en:
                st.markdown(st.session_state.disease_report_en)
            with tab_te:
                st.markdown(st.session_state.disease_report_te)
            with tab_hi:
                st.markdown(st.session_state.disease_report_hi)
        else:
            st.info(L("Upload an image on the left and click 'Diagnose Leaf Disease' to view the AI analysis report."))
        st.markdown("</div>", unsafe_allow_html=True)

# 6. VOICE INTERACTION PAGE
elif page == "Voice Interaction":
    st.title(f"🎙️ {L('Voice Interaction Assistant')}")
    st.write(L("Ask a question in Telugu (or target language). The AI answers back both as text and speech output."))
    
    # Initialize chat history in session state
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    if "last_recorded_speech" not in st.session_state:
        st.session_state.last_recorded_speech = ""
    if "text_query_val" not in st.session_state:
        st.session_state.text_query_val = ""
        
    col1, col2 = st.columns([5, 7])
    with col1:
        st.markdown(f"<div class='farm-card'><h4>{L('Voice Input')}</h4>", unsafe_allow_html=True)
        st.write(L("Press the button below, speak your agricultural question, and wait for analysis."))
        
        # Custom speech to text button
        speech_text = speech_to_text(
            start_prompt=L("Click to Speak / Record"),
            stop_prompt=L("Stop Recording"),
            language="te",  # Force Telugu speech recognition for recorded audio section
            just_once=True,
            use_container_width=True,
            key="voice_input_stt"
        )
        
        # If new speech text is detected, pre-fill it in the text box
        if speech_text and speech_text != st.session_state.last_recorded_speech:
            st.session_state.last_recorded_speech = speech_text
            st.session_state.text_query_val = speech_text
            
        # Wrap input and submit in a form so both button click and Enter key work
        with st.form(key="voice_chat_form", clear_on_submit=False):
            user_query = st.text_input(
                L("Edit or type your question:"),
                value=st.session_state.text_query_val,
                placeholder=L("e.g. My chili crop leaves are turning yellow...")
            )
            submit_clicked = st.form_submit_button(L("Submit Question 🚀"), use_container_width=True)
            
        if submit_clicked and user_query.strip():
            query_str = user_query.strip()
            
            # Auto-detect language script
            if any(0x0C00 <= ord(c) <= 0x0C7F for c in query_str):
                chat_lang = "Telugu"
            elif any(0x0900 <= ord(c) <= 0x097F for c in query_str):
                chat_lang = "Hindi"
            else:
                chat_lang = selected_lang_name
                
            with st.spinner(L("KrishiMitra AI is formulating advice...")):
                # Query AI directly in the user's language without double translation!
                advice_translated = chat_voice_ai(query_str, config, language_name=chat_lang)
                    
            with st.spinner(L("Synthesizing speech playback...")):
                # Synthesize TTS in target language
                tts_audio = text_to_speech_bytes(advice_translated, language_name=chat_lang)
                
            # Append to chat history
            st.session_state.chat_history.append({"role": "user", "text": query_str})
            st.session_state.chat_history.append({"role": "ai", "text": advice_translated, "audio": tts_audio})
            
            # Clear state for next input
            st.session_state.text_query_val = ""
            st.session_state.last_recorded_speech = ""
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        st.markdown(f"<div class='farm-card'><h4>{L('Conversation History')}</h4>", unsafe_allow_html=True)
        if st.session_state.chat_history:
            # Clear history button
            if st.button(L("Clear Conversation")):
                st.session_state.chat_history = []
                st.session_state.last_processed_query = ""
                st.rerun()
                
            st.markdown("<div class='chat-container'>", unsafe_allow_html=True)
            for idx, msg in enumerate(st.session_state.chat_history):
                if msg["role"] == "user":
                    st.markdown(f"<div class='chat-bubble chat-bubble-user'><b>🧑🌾 {L('Farmer')}:</b><br/>{msg['text']}</div>", unsafe_allow_html=True)
                else:
                    st.markdown(f"<div class='chat-bubble chat-bubble-ai'><b>🌾 KrishiMitra AI:</b><br/>{msg['text']}</div>", unsafe_allow_html=True)
                    if msg.get("audio"):
                        import base64
                        b64_audio = base64.b64encode(msg["audio"]).decode("utf-8")
                        audio_html = f'<audio src="data:audio/mp3;base64,{b64_audio}" controls style="width: 100%; margin-top: 8px;"></audio>'
                        st.markdown(audio_html, unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.info(L("Speak or type a question on the left to start the conversation with KrishiMitra AI."))
        st.markdown("</div>", unsafe_allow_html=True)

# Render Footer (Formal Corporate layout)
st.markdown("---")
st.markdown(f"""
<div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 0; font-size: 13px; color: #64748b; font-weight: 500;">
    <div>© 2026 KrishiMitra AI. All rights reserved.</div>
    <div style="display: flex; gap: 20px;">
        <span><b>Mode</b>: {config['mode']}</span>
        <span><b>Provider</b>: {config['cloud_provider'] if config['mode'] == 'Cloud' else config['ollama_model']}</span>
        <span><b>Language</b>: {selected_lang_name}</span>
    </div>
</div>
""", unsafe_allow_html=True)
