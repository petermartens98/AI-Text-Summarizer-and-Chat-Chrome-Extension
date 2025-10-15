# AI Text Summarizer Extension

 A Chrome web extension that provides instant text summarization and key point generation; with user preferences and language in mind; Backend is Python/Flask based and utilizes DeepSeek AI, with cloud storage powered by Supabase (PostgreSQL).

## Features

- 🎯 **Context Menu Integration** - Right-click any highlighted text to generate summaries
- 📝 **Direct Input** - Paste text directly into the extension popup
- 💾 **Cloud Storage** - Automatically saves summaries and key points to Supabase
- ⚡ **Fast & Efficient** - Powered by DeepSeek's AI model
- 🌍 **Multi-Language Support** – Generate summaries in your preferred language
- 🎨 **User Preferences** – Tailor summaries to your writing style and content needs

## Tech Stack

- **Frontend**: Chrome Extension (Manifest V3)
- **Backend**: Flask (Python)
- **AI Model**: DeepSeek Chat
- **Database**: Supabase (PostgreSQL)

---

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to the SQL Editor in your Supabase dashboard
3. Run the following SQL queries:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id integer NOT NULL DEFAULT 1,
    text text NOT NULL,
    summary text NOT NULL,
    key_points jsonb,
    url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1,
    preferences TEXT,
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

INSERT INTO public.user_preferences (user_id, language, theme, preferences) 
VALUES (1, 'en', 'light', '')
ON CONFLICT (user_id) DO NOTHING;
```

4. Copy your **Supabase URL** and **API Key** (anon/public) from Project Settings → API

### 2. Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Create and activate virtual environment**
   
   **Windows:**
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
   
   **macOS/Linux:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

5. **Start the Flask server**
   ```bash
   python app.py
   ```
   
   The backend will be running at `http://localhost:5000`

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The extension icon should now appear in your Chrome toolbar

---

## Usage

### Method 1: Context Menu (Recommended)
1. Highlight any text on a webpage
2. Right-click the selected text
3. Click **"Summarize with DeepSeek"**
4. View the summary in the extension popup

### Method 2: Direct Input
1. Click the extension icon in your Chrome toolbar
2. Paste or type text into the input field
3. Click the summarize button
4. View your generated summary and key points

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/summarize` | Generate summary from text |
| GET | `/summaries` | Retrieve all saved summaries |
| GET | `/summaries/:id` | Retrieve specific summary |

---

## Requirements

- Python 3.8+
- Chrome Browser (version 88+)
- DeepSeek API key ([Get one here](https://platform.deepseek.com))
- Supabase account

---

## Troubleshooting

**Backend won't start?**
- Ensure all environment variables are set correctly in `.env`
- Verify your virtual environment is activated
- Check if port 5000 is available

**Extension not working?**
- Verify the backend is running at `http://localhost:5000`
- Check the extension is enabled in `chrome://extensions/`
- Review the console logs (right-click extension icon → Inspect popup)

**Database errors?**
- Confirm your Supabase URL and API key are correct
- Verify the `summaries` table was created successfully

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Acknowledgments

- [DeepSeek](https://www.deepseek.com/) for AI model access
- [Supabase](https://supabase.com/) for database infrastructure