import { GoogleGenAI, Type, Schema } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface IslAssistRequest {
  recognizedLabel: string;
  outputLanguage?: "English" | "Hindi" | "Hinglish" | string;
  context?: string;
  currentSentence?: string;
}

export interface IslAssistResponse {
  recognized_label: string;
  message: string;
  speakable_text: string;
  needs_confirmation: boolean;
}

// Exact verified model vocabulary supported by MediaPipe Gesture Recognizer
export const VERIFIED_ISL_MODEL_LABELS: Record<string, { englishName: string; defaultMeaning: string }> = {
  Open_Palm: {
    englishName: "Open Palm",
    defaultMeaning: "Stop, wait, or greeting (Hello)",
  },
  Closed_Fist: {
    englishName: "Closed Fist",
    defaultMeaning: "Attention, firm agreement, or hold",
  },
  Thumb_Up: {
    englishName: "Thumbs Up",
    defaultMeaning: "Yes, agree, good, or approved",
  },
  Thumb_Down: {
    englishName: "Thumbs Down",
    defaultMeaning: "No, disagree, not okay, or need assistance",
  },
  Victory: {
    englishName: "Victory / V-Sign",
    defaultMeaning: "Victory, two, peace, or positive affirmation",
  },
  Pointing_Up: {
    englishName: "Pointing Up",
    defaultMeaning: "One, look up, wait a moment, or excuse me",
  },
  ILoveYou: {
    englishName: "I Love You",
    defaultMeaning: "Warm regard, gratitude, or friendly appreciation",
  },
};

const islAssistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recognized_label: {
      type: Type.STRING,
      description: "The exact label recognized by the vision model without alteration.",
    },
    message: {
      type: Type.STRING,
      description: "Concise, respectful text representation in the target language (Hindi, Hinglish, or English).",
    },
    speakable_text: {
      type: Type.STRING,
      description: "Clear, fluent, concise text designed specifically for text-to-speech reading.",
    },
    needs_confirmation: {
      type: Type.BOOLEAN,
      description: "Always true to ensure the user explicitly confirms meaning.",
    },
  },
  required: ["recognized_label", "message", "speakable_text", "needs_confirmation"],
};

export async function processIslAssist(req: IslAssistRequest): Promise<IslAssistResponse> {
  const { recognizedLabel, outputLanguage = "Hinglish", currentSentence = "" } = req;

  if (!recognizedLabel || typeof recognizedLabel !== "string") {
    throw {
      statusCode: 400,
      message: "A valid recognizedLabel must be provided.",
    };
  }

  const normalizedLabel = recognizedLabel.trim();
  const labelInfo = VERIFIED_ISL_MODEL_LABELS[normalizedLabel];

  // If label is not in verified model dictionary, do not invent or guess
  if (!labelInfo) {
    throw {
      statusCode: 400,
      message: `Unsupported model label: "${normalizedLabel}". Only verified model vocabulary is supported.`,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing on server, falling back to verified dictionary representation.");
    return generateFallbackAssist(normalizedLabel, outputLanguage);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "x-goog-api-client": "aistudio-build/signbridge-isl",
      },
    },
  });

  const prompt = `You are assisting a deaf or hard-of-hearing user communicating through an experimental client-side camera gesture recognizer (ISL Camera Translator — Beta).
The verified vision model on-device has detected the exact gesture label: "${normalizedLabel}" (${labelInfo.englishName}).
Default recognized meaning: "${labelInfo.defaultMeaning}".
Target Output Language: ${outputLanguage}.
Context: communication_assist.
${currentSentence ? `Ongoing sentence context so far: "${currentSentence}"` : ""}

CRITICAL STRICT RULES:
1. NEVER invent or hallucinate signs not recognized by the model. The only recognized sign is "${normalizedLabel}".
2. Preserve the verified meaning faithfully:
   - Open_Palm: Stop, wait, or polite greeting/attention.
   - Closed_Fist: Solid agreement, attention, or hold.
   - Thumb_Up: Yes, agree, positive acknowledgement, okay.
   - Thumb_Down: No, disagree, need help, or not okay.
   - Victory: Peace, success, two, or victory.
   - Pointing_Up: One, wait a second, excuse me, or looking up.
   - ILoveYou: Best regards, gratitude, friendship.
3. Language specifications:
   - If outputLanguage is "Hinglish": Use easy, conversational Roman Hindi mixed with English (e.g. "Haan, main agree karta hoon" or "Rukiye, ek minute please").
   - If outputLanguage is "Hindi": Use natural, polite Hindi in Devanagari script (e.g. "हाँ, मुझे स्वीकार है।" or "कृपया एक मिनट रुकें।").
   - If outputLanguage is "English": Use clear, courteous, concise English (e.g. "Yes, I agree." or "Please wait a moment.").
4. "speakable_text" must be a concise, direct first-person statement ready for browser SpeechSynthesis.
5. "message" should be clear and concise for screen display.
6. "needs_confirmation" must be true.
7. Return strictly valid JSON adhering to the schema.`;

  const candidateModels = [
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
  ];

  let response: any = null;
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const callPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: islAssistSchema,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), 6000)
      );

      response = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`ISL assist model ${modelName} failed:`, err?.message || err);
    }
  }

  if (!response || !response.text) {
    console.warn("Gemini assist model call failed, falling back to verified dictionary:", lastError?.message);
    return generateFallbackAssist(normalizedLabel, outputLanguage);
  }

  try {
    let cleanText = response.text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanText) as IslAssistResponse;
    return {
      recognized_label: normalizedLabel,
      message: parsed.message || labelInfo.defaultMeaning,
      speakable_text: parsed.speakable_text || parsed.message || labelInfo.defaultMeaning,
      needs_confirmation: true,
    };
  } catch (parseErr) {
    console.error("Failed to parse Gemini ISL response JSON:", parseErr);
    return generateFallbackAssist(normalizedLabel, outputLanguage);
  }
}

function generateFallbackAssist(label: string, language: string): IslAssistResponse {
  const dictionary: Record<string, { English: string; Hindi: string; Hinglish: string }> = {
    Open_Palm: {
      English: "Please stop or wait a moment.",
      Hindi: "कृपया रुकें या एक मिनट प्रतीक्षा करें।",
      Hinglish: "Please rukiye ya ek minute wait kijiye.",
    },
    Closed_Fist: {
      English: "Attention / I am ready.",
      Hindi: "ध्यान दें / मैं तैयार हूँ।",
      Hinglish: "Attention please / Main ready hoon.",
    },
    Thumb_Up: {
      English: "Yes, I agree and understand.",
      Hindi: "हाँ, मैं सहमत हूँ और समझ गया।",
      Hinglish: "Haan, main agree karta hoon aur samajh gaya.",
    },
    Thumb_Down: {
      English: "No, I disagree or need assistance.",
      Hindi: "नहीं, मैं असहमत हूँ या मुझे सहायता चाहिए।",
      Hinglish: "Nahi, main disagree karta hoon ya mujhe help chahiye.",
    },
    Victory: {
      English: "Victory, peace, or positive affirmation.",
      Hindi: "विजय, शांति, या सकारात्मक पुष्टि।",
      Hinglish: "Victory / Peace, sab theek hai.",
    },
    Pointing_Up: {
      English: "Excuse me, wait one moment.",
      Hindi: "माफ़ कीजिए, एक पल प्रतीक्षा कीजिए।",
      Hinglish: "Excuse me, bas ek minute rukiye.",
    },
    ILoveYou: {
      English: "With warm regards and gratitude.",
      Hindi: "हार्दिक शुभकामनाओं और आभार के साथ।",
      Hinglish: "Warm regards aur bahut bahut shukriya.",
    },
  };

  const entry = dictionary[label] || {
    English: "Gesture recognized.",
    Hindi: "संकेत पहचाना गया।",
    Hinglish: "Gesture recognize ho gaya.",
  };

  const text = (entry as any)[language] || entry.English;
  return {
    recognized_label: label,
    message: text,
    speakable_text: text,
    needs_confirmation: true,
  };
}
