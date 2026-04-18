import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function checkGrammar(text: string, inputLanguage: string): Promise<string> {
  const langContext = inputLanguage !== 'Auto Detect' ? `The text is in ${inputLanguage}. ` : '';
  const prompt = `You are an expert grammar proofreader. Please review the following text. 
${langContext}Identify any grammatical, spelling, or punctuation errors and correct them. 
Provide the corrected text first, followed by a brief bulleted list explaining what was changed and why (if there were any errors).
If the text is already perfect, just say that it's perfect and return the original text.

Text to review:
"""
${text}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function rewriteText(text: string, inputLanguage: string): Promise<string> {
  const langContext = inputLanguage !== 'Auto Detect' ? `The text is in ${inputLanguage}. ` : '';
  const prompt = `You are an expert writer. ${langContext}Rewrite the following text to sound more polished, professional, and natural, while maintaining the original meaning. 
Provide a couple of different variations (e.g., Professional, Casual, Concise).

Text to rewrite:
"""
${text}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function translateText(text: string, targetLanguage: string, inputLanguage: string): Promise<string> {
  const langContext = inputLanguage !== 'Auto Detect' ? ` from ${inputLanguage} ` : ' ';
  const prompt = `You are a professional translator. Translate the following text${langContext}into ${targetLanguage}. Ensure the translation is natural, accurate, and culturally appropriate.

Text to translate:
"""
${text}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function generateArticle(topic: string, language: string, inputLanguage: string): Promise<string> {
  const prompt = `You are an expert copywriter and article generator. Write a comprehensive, engaging, and well-structured article about the following topic.
Write the article entirely in ${language}. Use appropriate formatting such as headings, lists, and paragraphs.
${inputLanguage !== 'Auto Detect' ? `(Note: The input topic provided below is in ${inputLanguage})` : ''}

Topic:
"""
${topic}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function brainstormIdeas(topic: string, inputLanguage: string): Promise<string> {
  const prompt = `You are an expert creative consultant. The user has provided the following topic.
Brainstorm and share a list of creative ideas, sub-topics, angles, or content directions related to this topic. Provide the output in a clear, structured format using both English and Bengali (so the user fully understands the creative nuances).
${inputLanguage !== 'Auto Detect' ? `(Note: The input topic provided below is in ${inputLanguage})` : ''}

Topic:
"""
${topic}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function summarizeBook(bookQuery: string, language: string, inputLanguage: string): Promise<string> {
  const prompt = `You are an expert literary critic and book summarizer. Provide a comprehensive summary and analysis of the book or topic "${bookQuery}".
Write the entire response in ${language}. 
${inputLanguage !== 'Auto Detect' ? `(Note: The input title/topic provided is in ${inputLanguage})` : ''}
Please include:
- A brief overview/plot summary
- Key themes and concepts
- Main takeaways or lessons
- Format using proper Markdown (headings, bullet points, bold text).`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function generateFullBook(bookQuery: string, language: string, inputLanguage: string): Promise<string> {
  const prompt = `You are an expert author and literary creator. Produce a comprehensive and detailed "Full Book" or story version of "${bookQuery}".
Write the entire response in ${language}. 
${inputLanguage !== 'Auto Detect' ? `(Note: The input concept/title provided is in ${inputLanguage})` : ''}
Please include:
- A captivating Title and Author/Introduction
- Several cohesive, well-written chapters filled with details and narrative
- A clear conclusion or epilogue.
Make it as informative and extensive as possible to simulate a full book. Format using proper Markdown (headings, bullet points, bold text).`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "No response generated.";
}

export async function summarizePdf(base64Data: string, language: string): Promise<string> {
  const prompt = `You are an expert document summarizer. Please review the attached PDF document and provide a comprehensive, well-structured summary. 
Follow these guidelines:
- Highlight the key points, main arguments, and conclusions.
- Write the entire summary in ${language}.
- Use proper Markdown formatting (headings, bullet points, bold text).`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      },
      prompt
    ]
  });

  return response.text || "No response generated.";
}
