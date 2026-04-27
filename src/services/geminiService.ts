import { GoogleGenAI } from "@google/genai";

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    // 1. AI Studio Build (Free Tier) uses process.env.GEMINI_API_KEY
    // 2. Local dev or Vercel uses import.meta.env.VITE_GEMINI_API_KEY
    const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === "undefined" || apiKey === "" || (typeof apiKey === 'string' && apiKey.includes("MY_GEMINI_API_KEY"))) {
      throw new Error("Gemini API Key missing. If you're using AI Studio, ensure 'GEMINI_API_KEY' is set to 'AI Studio Free Tier' in the Secrets menu. If you're on Vercel, check VITE_GEMINI_API_KEY.");
    }
    
    genAIInstance = new GoogleGenAI(apiKey.trim());
  }
  return genAIInstance;
}

export async function checkGrammar(text: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const langContext = inputLanguage !== 'Auto Detect' ? `The text is in ${inputLanguage}. ` : '';
  const prompt = `You are an expert grammar proofreader. Please review the following text. 
${langContext}Identify any grammatical, spelling, or punctuation errors and correct them. 
Provide the corrected text first, followed by a brief bulleted list explaining what was changed and why.
If the text is already perfect, just say that it's perfect and return the original text.

Text:
"""
${text}
"""`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function rewriteText(text: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const langContext = inputLanguage !== 'Auto Detect' ? `The text is in ${inputLanguage}. ` : '';
  const prompt = `You are an expert writer. ${langContext}Rewrite the following text to sound more polished, professional, and natural. 
Provide 2-3 different variations (Professional, Casual, Concise).

Text:
"""
${text}
"""`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function translateText(text: string, targetLanguage: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const langContext = inputLanguage !== 'Auto Detect' ? ` from ${inputLanguage} ` : ' ';
  const prompt = `You are a professional translator. Translate the following text${langContext}into ${targetLanguage}. 
Ensure the translation is natural and accurate.

Text:
"""
${text}
"""`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function generateArticle(topic: string, language: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  // Using Pro for longer content generation
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `You are an expert article writer. Write a comprehensive, engaging article about the topic below.
Language: ${language}
${inputLanguage !== 'Auto Detect' ? `(Input topic language: ${inputLanguage})` : ''}

Topic:
"""
${topic}
"""`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function brainstormIdeas(topic: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `Brainstorm a list of creative ideas related to: "${topic}". 
Provide the output in both English and Bengali.
${inputLanguage !== 'Auto Detect' ? `(Input topic language: ${inputLanguage})` : ''}`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function summarizeBook(bookQuery: string, language: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `Summary and analysis of the book/topic: "${bookQuery}".
Language: ${language}
Include: Overview, Key Themes, and Main Takeaways. Use Markdown formatting.`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function generateFullBook(bookQuery: string, language: string, inputLanguage: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `Generate a detailed book/story concept based on: "${bookQuery}".
Language: ${language}
Provide a Title, Introduction, and several detailed chapter outlines/narratives.`;

  const result = await model.generateContent(prompt);
  return result.response.text() || "No response generated.";
}

export async function summarizePdf(base64Data: string, language: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Summarize the attached PDF in ${language}. Highlight main arguments and key points.`;

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Data,
        mimeType: "application/pdf"
      }
    },
    prompt
  ]);

  return result.response.text() || "No response generated.";
}
