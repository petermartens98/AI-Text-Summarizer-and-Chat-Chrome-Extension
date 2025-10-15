from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime
import uuid

load_dotenv()


app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

# Language mapping
LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'pt': 'Portuguese'
}



@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    text = data.get("text", "")
    language = data.get("language", "en")
    preferences = data.get("preferences", "")
    SUMMARIZE_PROMPT = f"""
        ROLE:
        You are an intelligent text analysis assistant that provides clear and concise summaries.

        TASK:
        Given a passage of text, you will:
        - 1. Write a short 2–3 sentence summary.
        - 2. Extract 3–5 key points as bullet-style items.

        USER CONTEXT:
        - Output Languge:  {LANGUAGE_NAMES.get(language, 'English')}
        - User Preferences: {preferences}

        OUTPUT JSON FORMAT:
        {{
            "summary": "string",
            "key_points": ["string", "string", "string"]
        }}
        Ensure valid JSON output only — no commentary, no markdown.
    """


    if not text:
        return jsonify({"error": "No text provided"}), 400


    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": SUMMARIZE_PROMPT},
            {"role": "user", "content": text}
        ],
        response_format={
            'type': 'json_object'
        }
    )

    raw_result = response.choices[0].message.content.strip()
    try:
        result = json.loads(raw_result)  # parse string to JSON
    except json.JSONDecodeError:
        result = {"summary": raw_result, "key_points": []}

    return jsonify(result)


chat_memory = {} 

@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()
    question = data.get("question", "")
    context = data.get("context", {})
    session_id = data.get("session_id", None)  # optional, generate if missing

    if not session_id:
        session_id = str(uuid.uuid4())  # create new session

    if session_id not in chat_memory:
        chat_memory[session_id] = []

    if not question or not context:
        return jsonify({"answer": "Missing question or context."}), 400
    
    CHAT_PROMPT = f"""
        ROLE: You are a helpful assistant.

        TASK: Consider provided context to assist with user queries.

        CONTEXT: 
        - Original Text: {context.get("text", "")}
        - Summary: {context.get("summary", "")}
        - Key Points: {context.get("key_points", [])}
    """

    # Build messages for the model: context + previous chat
    messages = []

    # Add initial context as system message
    messages.append({
        "role": "system",
        "content": CHAT_PROMPT
    })

    # Add previous conversation for this session
    messages.extend(chat_memory[session_id])

    # Add current user question
    messages.append({"role": "user", "content": question})

    # Call model
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages
    )

    answer = response.choices[0].message.content.strip()

    # Store this turn in memory
    chat_memory[session_id].append({"role": "user", "content": question})
    chat_memory[session_id].append({"role": "assistant", "content": answer})

    return jsonify({"answer": answer, "session_id": session_id})



@app.route("/save_summary", methods=["POST"])
def save_summary():
    data = request.get_json()
    user_id = data.get("user_id", 1)  # default to 1
    text = data.get("text", "")
    summary = data.get("summary", "")
    key_points = data.get("key_points", [])
    url = data.get("url", "")

    if not text or not summary:
        return jsonify({"error": "Missing text or summary"}), 400

    supabase.table("summaries").insert({
        "user_id": user_id,
        "text": text,
        "summary": summary,
        "key_points": key_points,
        "url": url
    }).execute()

    return jsonify({"status": "success"})


@app.route("/summaries", methods=["GET"])
def get_summaries():
    user_id = request.args.get("user_id", 1)  # default to 1
    response = supabase.table("summaries").select("*").eq("user_id", int(user_id)).order("created_at", desc=True).execute()
    return jsonify(response.data)


# Get user preferences
@app.route('/preferences/<int:user_id>', methods=['GET'])
def get_preferences(user_id):
    try:
        response = supabase.table('user_preferences').select('*').eq('user_id', user_id).execute()
        if response.data and len(response.data) > 0:
            return jsonify(response.data[0]), 200
        else:
            # Return default preferences if none exist
            return jsonify({
                'user_id': user_id,
                'language': 'en',
                'theme': 'light',
                'preferences': ''
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update user preferences
@app.route('/preferences/<int:user_id>', methods=['PUT'])
def update_preferences(user_id):
    try:
        data = request.json
        
        # Check if preferences exist
        existing = supabase.table('user_preferences').select('*').eq('user_id', user_id).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing preferences
            response = supabase.table('user_preferences').update({
                'preferences': data.get('preferences'),
                'language': data.get('language'),
                'theme': data.get('theme'),
                'updated_at': datetime.utcnow().isoformat()
            }).eq('user_id', user_id).execute()
        else:
            # Insert new preferences
            response = supabase.table('user_preferences').insert({
                'user_id': user_id,
                'preferences': data.get('preferences', ''),
                'language': data.get('language', 'en'),
                'theme': data.get('theme', 'light')
            }).execute()
        
        return jsonify(response.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500




if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
