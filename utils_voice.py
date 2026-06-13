import io
import speech_recognition as sr
import socket
from gtts import gTTS
from deep_translator import GoogleTranslator

# Set a global socket timeout of 10 seconds to prevent indefinite API/gTTS hangs
socket.setdefaulttimeout(10)

# Language mapping
LANG_MAP = {
    "English": {"code": "en", "sr_code": "en-IN", "gtts_code": "en"},
    "Telugu": {"code": "te", "sr_code": "te-IN", "gtts_code": "te"},
    "Hindi": {"code": "hi", "sr_code": "hi-IN", "gtts_code": "hi"}
}

def translate_text(text, src_lang='auto', dest_lang='en'):
    """Translate text to target language with chunking for large texts."""
    if not text:
        return ""
    if src_lang == dest_lang:
        return text
    try:
        translator = GoogleTranslator(source=src_lang, target=dest_lang)
        max_chunk_size = 3000
        
        if len(text) <= max_chunk_size:
            return translator.translate(text)
            
        chunks = []
        current_chunk = []
        current_length = 0
        
        for line in text.splitlines(keepends=True):
            if current_length + len(line) > max_chunk_size:
                if current_chunk:
                    chunks.append("".join(current_chunk))
                    current_chunk = []
                    current_length = 0
                if len(line) > max_chunk_size:
                    for i in range(0, len(line), max_chunk_size):
                        chunks.append(line[i:i+max_chunk_size])
                else:
                    current_chunk.append(line)
                    current_length = len(line)
            else:
                current_chunk.append(line)
                current_length += len(line)
                
        if current_chunk:
            chunks.append("".join(current_chunk))
            
        translated_chunks = []
        for chunk in chunks:
            if chunk.strip():
                translated_chunks.append(translator.translate(chunk))
            else:
                translated_chunks.append(chunk)
                
        return "".join(translated_chunks)
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return text

def transcribe_audio(audio_bytes, language_name="Telugu"):
    """
    Transcribe audio bytes (WAV/MP3/etc.) using Google Web Speech API.
    Supports Telugu, Hindi, English.
    """
    lang_info = LANG_MAP.get(language_name, LANG_MAP["English"])
    language_code = lang_info["sr_code"]
    
    r = sr.Recognizer()
    try:
        # Check if audio is valid
        if not audio_bytes or len(audio_bytes) == 0:
            return "Error: Empty audio bytes received."
            
        audio_file = io.BytesIO(audio_bytes)
        with sr.AudioFile(audio_file) as source:
            audio_data = r.record(source)
            
        # Perform speech recognition
        text = r.recognize_google(audio_data, language=language_code)
        return text
    except sr.UnknownValueError:
        return "Error: Could not understand the voice audio. Please speak clearly near the microphone."
    except sr.RequestError as e:
        return f"Error connecting to Speech Recognition service: {str(e)}"
    except Exception as e:
        # If it fails due to audio format headers, we can return the error
        return f"Audio parsing error: {str(e)}. (Ensure input is a valid WAV audio file)"

def text_to_speech_bytes(text, language_name="Telugu"):
    """Convert text to speech audio bytes (MP3) using gTTS."""
    lang_info = LANG_MAP.get(language_name, LANG_MAP["English"])
    gtts_code = lang_info["gtts_code"]
    
    try:
        if not text or len(text.strip()) == 0:
            return None
            
        tts = gTTS(text=text, lang=gtts_code, slow=False)
        audio_io = io.BytesIO()
        tts.write_to_fp(audio_io)
        audio_io.seek(0)
        return audio_io.read()
    except Exception as e:
        print(f"TTS generation error: {str(e)}")
        return None
