export async function summarizeText(text) {
    const response = await fetch("http://localhost:5000/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })
    if (!response.ok) throw new Error("Failed to summarize text")
    return response.json()
  }
  