// ===== User Preferences =====
const USER_ID = 1; // For development
let userPreferences = {
  preferences: '',
  language: 'en'
};

// Load user preferences
async function loadUserPreferences() {
  try {
    const response = await fetch(`http://localhost:5000/preferences/${USER_ID}`);
    if (!response.ok) {
      console.warn("Failed to load preferences, using defaults");
      return userPreferences;
    }
    const prefs = await response.json();
    userPreferences = {
      preferences: prefs.preferences || '',
      language: prefs.language || 'en'
    };
    console.log("Loaded preferences:", userPreferences);
    return userPreferences;
  } catch (err) {
    console.error("Error loading preferences:", err);
    return userPreferences;
  }
}

// Save user preferences
async function saveUserPreferences(prefs) {
  try {
    console.log("Saving preferences:", prefs);
    const response = await fetch(`http://localhost:5000/preferences/${USER_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    if (!response.ok) {
      throw new Error(`Failed to save preferences: ${response.status}`);
    }
    const result = await response.json();
    userPreferences = {
      preferences: result.preferences || '',
      language: result.language || 'en'
    };
    console.log("Saved preferences:", userPreferences);
    return userPreferences;
  } catch (err) {
    console.error("Error saving preferences:", err);
    throw err;
  }
}

// ===== API calls =====
async function summarizeText(text, language, preferences) {
  const response = await fetch("http://localhost:5000/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, preferences })
  });
  if (!response.ok) throw new Error("Failed to summarize text");
  return response.json();
}

async function chatWithText(question, context, session_id = null) {
  const response = await fetch("http://localhost:5000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context, session_id })
  });
  if (!response.ok) throw new Error("Failed to chat");
  return response.json();
}

// ===== Get Current Tab URL =====
async function getCurrentTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) reject("No active tab");
      else resolve(tabs[0].url);
    });
  });
}

// ===== Load Saved Summaries =====
async function loadSavedSummaries() {
  const res = await fetch(`http://localhost:5000/summaries?user_id=${USER_ID}`);
  const data = await res.json();
  const select = document.getElementById("summarySelect");
  select.innerHTML = '<option value="">-- Select a previous summary --</option>';
  data.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.summary.substring(0, 50) + "..."; // preview
    option.dataset.text = item.text;
    option.dataset.summary = item.summary;
    option.dataset.keyPoints = JSON.stringify(item.key_points);
    option.dataset.url = item.url;
    select.appendChild(option);
  });
}

// ===== DOM elements =====
const input = document.getElementById("input");
const summaryText = document.getElementById("summaryText");
const keyPointsList = document.getElementById("keyPointsList");
const resultDiv = document.getElementById("result");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

let sessionId = null;

// Hide result initially
resultDiv.style.display = "none";

// ===== Generate Summary =====
async function generateSummary(text) {
  if (!text.trim()) return;

  let url = "";
  try {
    url = await getCurrentTabUrl();
  } catch (err) {
    console.warn("Could not get current tab URL:", err);
  }

  resultDiv.style.display = "block";
  summaryText.textContent = "Summarizing...";
  keyPointsList.innerHTML = "Extracting Key Points...";
  
  document.getElementById("summarizeBtn").disabled = true;
  chatBox.innerHTML = "";
  sessionId = null;

  try {
    // Pass language and custom preferences to API
    const result = await summarizeText(
      text,
      userPreferences.language || 'en',
      userPreferences.preferences || ''
    );

    summaryText.textContent = result.summary || "No summary returned.";

    if (Array.isArray(result.key_points) && result.key_points.length > 0) {
      keyPointsList.innerHTML = "";
      result.key_points.forEach(point => {
        const li = document.createElement("li");
        li.textContent = point;
        keyPointsList.appendChild(li);
      });
    }

    // Save summary + key points + URL + user ID
    await fetch("http://localhost:5000/save_summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        text,
        summary: result.summary,
        key_points: result.key_points,
        url
      })
    });

    // Reload dropdown after save
    loadSavedSummaries();

  } catch (err) {
    summaryText.textContent = "Error: " + err.message;
  } finally {
    document.getElementById("summarizeBtn").disabled = false;
  }
}

// ===== Chat Functions =====
function appendChatMessage(sender, message) {
  const div = document.createElement("div");
  div.className = `chat-message ${sender}`;
  div.textContent = message;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendChatMessage() {
  const question = chatInput.value;
  if (!question.trim()) return;
  chatInput.value = "";
  appendChatMessage("user", question);

  const context = {
    text: input.value,
    summary: summaryText.textContent,
    key_points: Array.from(keyPointsList.children).map(li => li.textContent)
  };

  try {
    const result = await chatWithText(question, context, sessionId);
    appendChatMessage("bot", result.answer || "No response from server.");
    sessionId = result.session_id || sessionId;
  } catch (err) {
    appendChatMessage("bot", "Error: " + err.message);
  }
}

// ===== Settings Modal =====
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.querySelector('.close');
const savePrefsBtn = document.getElementById('savePrefsBtn');
const cancelPrefsBtn = document.getElementById('cancelPrefsBtn');

// Open settings modal
settingsBtn.addEventListener('click', async () => {
  console.log("Opening settings modal...");
  await loadUserPreferences();
  populateSettingsForm();
  settingsModal.style.display = 'block';
});

// Close modal
closeModal.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

cancelPrefsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
});

// Populate settings form with current preferences
function populateSettingsForm() {
  console.log("Populating form with:", userPreferences);
  const prefsTextarea = document.getElementById('preferencesText');
  const langSelect = document.getElementById('languageSelect');
  
  if (prefsTextarea) {
    prefsTextarea.value = userPreferences.preferences || '';
  }
  if (langSelect) {
    langSelect.value = userPreferences.language || 'en';
  }
}

// Save preferences
savePrefsBtn.addEventListener('click', async () => {
  const prefsText = document.getElementById('preferencesText').value;
  const lang = document.getElementById('languageSelect').value;
  
  const prefs = {
    preferences: prefsText,
    language: lang
  };

  console.log("Attempting to save:", prefs);

  try {
    await saveUserPreferences(prefs);
    settingsModal.style.display = 'none';
    
    // Show success message
    alert('Preferences saved successfully!');
  } catch (err) {
    alert('Error saving preferences: ' + err.message);
  }
});

// ===== Event Listeners =====
document.getElementById("summarizeBtn").addEventListener("click", async () => {
  const text = input.value;
  await generateSummary(text);
});

document.getElementById("resetChatBtn").addEventListener("click", () => {
  chatBox.innerHTML = "";
  sessionId = null;
  chatInput.value = "";
});

chatSendBtn.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendChatMessage();
  }
});

// ===== Load selected past summary =====
document.getElementById("summarySelect").addEventListener("change", (e) => {
  const selected = e.target.selectedOptions[0];
  if (!selected || !selected.value) return;

  resultDiv.style.display = "block";

  input.value = selected.dataset.text;
  summaryText.textContent = selected.dataset.summary;

  const keyPoints = JSON.parse(selected.dataset.keyPoints || "[]");
  keyPointsList.innerHTML = "";
  keyPoints.forEach(point => {
    const li = document.createElement("li");
    li.textContent = point;
    keyPointsList.appendChild(li);
  });

  console.log("Source URL:", selected.dataset.url);

  chatBox.innerHTML = "";
  sessionId = null;
});

// ===== Initialize on DOMContentLoaded =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Extension loaded, initializing...");
  await loadUserPreferences();
  await loadSavedSummaries();
  console.log("Initialization complete");
});

// ===== Auto-summarize on right-click popup =====
chrome.storage.local.get(["selectedText", "autoSummarize"], async ({ selectedText, autoSummarize }) => {
  if (selectedText && selectedText.trim()) {
    input.value = selectedText

    // Ensure preferences are loaded from Supabase first
    await loadUserPreferences()

    if (autoSummarize) {
      await generateSummary(selectedText)
      chrome.storage.local.set({ autoSummarize: false })
    }
  }
})
