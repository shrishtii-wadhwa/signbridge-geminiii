import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TEXT_LENGTH = 5000;

// Lazy initialization of Gemini Client - read strictly from process.env.GEMINI_API_KEY
let genAIClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured in server environment variables."
      );
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "signbridge-app",
        },
      },
    });
  }
  return genAIClient;
}

export interface AnalyzeSignInput {
  imageBuffer?: Buffer;
  imageMimeType?: string;
  image?: string;
  mimeType?: string;
  inputText?: string;
  userQuestion?: string;
  language?: string;
  outputLanguage?: string;
  context?: string;
  userContext?: string;
}

export async function processSignAnalysis(input: AnalyzeSignInput) {
  const {
    imageBuffer,
    imageMimeType,
    image,
    mimeType,
    inputText,
    userQuestion,
    outputLanguage,
    language = outputLanguage || "Hinglish",
    userContext,
    context = userContext || "Traveler",
  } = input;

  const trimmedInputText = typeof inputText === "string" ? inputText.trim() : "";
  const hasInputText = trimmedInputText.length > 0;
  const userQuestionText = typeof userQuestion === "string" ? userQuestion.trim() : "";

  let base64Data: string | null = null;
  let detectedMime = imageMimeType || mimeType;

  if (imageBuffer && imageBuffer.length > 0) {
    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      const error: any = new Error("Image exceeds the maximum allowed size of 10 MB.");
      error.statusCode = 400;
      throw error;
    }
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime.toLowerCase())) {
      const error: any = new Error(
        "Invalid image type. Only JPEG, PNG, and WebP are allowed."
      );
      error.statusCode = 400;
      throw error;
    }
    base64Data = imageBuffer.toString("base64");
  } else if (typeof image === "string" && image.trim().length > 0) {
    const rawImage = image.trim();
    if (rawImage.startsWith("data:")) {
      const match = rawImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        base64Data = match[2];
      } else {
        const error: any = new Error("Invalid image data format.");
        error.statusCode = 400;
        throw error;
      }
    } else {
      base64Data = rawImage;
    }

    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime.toLowerCase())) {
      const error: any = new Error(
        "Invalid image type. Only JPEG, PNG, and WebP are allowed."
      );
      error.statusCode = 400;
      throw error;
    }

    const approximateBytes = Math.ceil((base64Data.length * 3) / 4);
    if (approximateBytes > MAX_IMAGE_BYTES) {
      const error: any = new Error("Image exceeds the maximum allowed size of 10 MB.");
      error.statusCode = 400;
      throw error;
    }
  }

  const hasImage = Boolean(base64Data && detectedMime);

  // 1. Require at least one of image or inputText
  if (!hasImage && !hasInputText) {
    const error: any = new Error("Add a photo or paste text before continuing.");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate inputText character limit
  if (hasInputText && trimmedInputText.length > MAX_TEXT_LENGTH) {
    const error: any = new Error("Input text exceeds the maximum allowed length of 5000 characters.");
    error.statusCode = 400;
    throw error;
  }

  // Initialize Gemini with server-only key
  const ai = getGeminiClient();

  const prompt = `
Analyze this real-world sign, notice, warning, label, circular, message, or public instruction.

Input Modality & Provided Sources:
${hasImage ? "- Visual Image: Attached and provided for visual examination." : "- Visual Image: None provided."}
${hasInputText ? `- User-Provided Text:\n"""\n${trimmedInputText}\n"""` : "- User-Provided Text: None provided."}
${userQuestionText ? `- Specific User Question: "${userQuestionText}"` : ""}

User Request Parameters:
- Target Output Language: "${language}"
- User Role / Context: "${context}"

Exact Behavioral Guidelines:
1. Input Source Priority:
   - When an image is present, examine it carefully.
   - When user-provided text is present, use it as the source text of the notice/sign/instruction.
   - When both are present, evaluate both; prioritize the user-provided text if it conflicts with or clarifies unclear image text.
2. "detected_text": Must contain the visible or typed source content used (exact text extracted from the sign or the user-provided notice text). Never invent text that is missing or unreadable. If neither is decipherable, state "Unclear text" and set "confidence" below 45.
3. "language_detected": Identify the primary source language of the original text.
4. "category": Must be strictly one of:
   "transport", "parking", "safety", "health", "education", "food", "government", "event", "public_notice", "other".
   (e.g., parking restrictions or tow zones MUST be classified as "parking").
5. "urgency": Must be strictly one of:
   "low", "medium", "high", "critical".
   (e.g., tow-away zones, fines, severe restrictions, or violations MUST be classified as "high" or "critical").
6. Translate the essential content into the requested language ("${language}"):
   - If output language is "Hinglish", output easy, natural Roman Hindi mixed with simple English (e.g., "Yahan gaadi park mat karo. Unauthorized vehicles ko owner ke kharche par tow kar liya jayega.").
   - If output language is "Hindi", provide fluent Hindi in Devanagari script.
   - If output language is "English", provide clear, natural English.
7. "simple_explanation": Provide a concise, plain-language breakdown of what the sign/notice means in everyday words that anyone can understand immediately.
8. "action_to_take": Give ONE concrete, immediate, and safe next action specifically tailored to the user's role ("${context}"). ${userQuestionText ? `Directly address the user's question ("${userQuestionText}") within this action.` : ""}
9. "why_it_matters": Explain why following this notice/sign matters and the exact consequence of ignoring it.
10. "safety_note": If there is a genuine physical risk, danger, or hazard, provide a focused safety warning. If there is NO genuine safety hazard, it MUST be exactly: "No special safety warning."
11. Return strictly valid JSON adhering to the provided schema.
`;

  const parts: any[] = [];
  if (hasImage && base64Data && detectedMime) {
    parts.push({
      inlineData: {
        mimeType: detectedMime,
        data: base64Data,
      },
    });
  }
  parts.push({
    text: prompt,
  });

  const schemaConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        detected_text: {
          type: Type.STRING,
          description: "Exact visible text extracted from the sign image or provided text.",
        },
        language_detected: {
          type: Type.STRING,
          description: "The primary language of the source text.",
        },
        category: {
          type: Type.STRING,
          enum: [
            "transport",
            "parking",
            "safety",
            "health",
            "education",
            "food",
            "government",
            "event",
            "public_notice",
            "other",
          ],
          description: "Primary domain category of the sign.",
        },
        urgency: {
          type: Type.STRING,
          enum: ["low", "medium", "high", "critical"],
          description: "Urgency classification: low, medium, high, or critical.",
        },
        translation: {
          type: Type.STRING,
          description: "Translation into chosen language (Hinglish, Hindi, or English).",
        },
        simple_explanation: {
          type: Type.STRING,
          description: "Clear, plain-language explanation of the sign's meaning.",
        },
        action_to_take: {
          type: Type.STRING,
          description: "One concrete, safe next action tailored for the user's context.",
        },
        why_it_matters: {
          type: Type.STRING,
          description: "Why this sign matters and what happens if ignored.",
        },
        safety_note: {
          type: Type.STRING,
          description:
            "Safety warning if hazard exists; must be 'No special safety warning.' if none.",
        },
        confidence: {
          type: Type.INTEGER,
          description: "Confidence rating from 0 to 100.",
        },
      },
      required: [
        "detected_text",
        "language_detected",
        "category",
        "urgency",
        "translation",
        "simple_explanation",
        "action_to_take",
        "why_it_matters",
        "safety_note",
        "confidence",
      ],
    },
  };

  let response;
  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
  ];

  let lastError: any = null;
  // Try models with fallback and a brief retry for transient network/503 errors
  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: schemaConfig,
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} (attempt ${attempt}) failed:`, err?.message || err);
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 500));
        }
      }
    }
    if (response && response.text) {
      break;
    }
  }

  const responseText = response?.text;
  if (!responseText) {
    throw lastError || new Error("Gemini returned an empty response.");
  }

  // Parse structured response, handling possible markdown fence if present
  const cleanedText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleanedText);
}
