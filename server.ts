import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Support base64 image uploads up to 15MB payload
app.use(express.json({ limit: "15mb" }));

// Lazy initialization of Gemini Client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Please ensure your API key is provided in the Settings > Secrets panel."
      );
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "SignBridge API" });
});

// Analyze sign / notice endpoint (supports Image, Text, or Both)
app.post("/api/analyze-sign", async (req: Request, res: Response) => {
  try {
    const {
      image,
      mimeType,
      inputText,
      userQuestion,
      outputLanguage,
      language = outputLanguage || "Hinglish",
      userContext,
      context = userContext || "Traveler",
    } = req.body;

    const hasImage = typeof image === "string" && image.trim().length > 0;
    const trimmedInputText = typeof inputText === "string" ? inputText.trim() : "";
    const hasInputText = trimmedInputText.length > 0;
    const userQuestionText = typeof userQuestion === "string" ? userQuestion.trim() : "";

    // 1. Validation: Require at least one of image or inputText
    if (!hasImage && !hasInputText) {
      res.status(400).json({
        success: false,
        error: "Add a photo or paste text before continuing.",
      });
      return;
    }

    // 2. Validation: inputText character limit (5,000 chars)
    if (hasInputText && trimmedInputText.length > 5000) {
      res.status(400).json({
        success: false,
        error: "Input text exceeds the maximum allowed length of 5,000 characters.",
      });
      return;
    }

    // 3. Validation & preparation for image if provided
    let base64Data: string | null = null;
    let detectedMime = mimeType;

    if (hasImage) {
      const rawImage = image.trim();
      if (rawImage.startsWith("data:")) {
        const match = rawImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          detectedMime = match[1];
          base64Data = match[2];
        } else {
          res.status(400).json({
            success: false,
            error: "Invalid data URL format for image.",
          });
          return;
        }
      } else {
        base64Data = rawImage;
      }

      // Validate allowed MIME types
      if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime.toLowerCase())) {
        res.status(400).json({
          success: false,
          error: `Unsupported image type '${detectedMime || "unknown"}'. Only JPEG, PNG, and WebP images are accepted.`,
        });
        return;
      }

      // Validate size (<= 10MB)
      const approximateBytes = Math.ceil((base64Data.length * 3) / 4);
      if (approximateBytes > MAX_IMAGE_BYTES) {
        res.status(400).json({
          success: false,
          error: "Image file exceeds the maximum allowed size of 10 MB. Please choose a smaller photo.",
        });
        return;
      }
    }

    // 4. Initialize Gemini
    const ai = getGeminiClient();

    // 5. Build prompt with user language, context, text, and optional question
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
4. Translate the essential content into the requested language ("${language}"):
   - If output language is "Hinglish", use natural, conversational Roman Hindi mixed comfortably with English (e.g., "Yahan gaadi park mat karo. Agar aap park karte ho, toh gaadi tow ho sakti hai.").
   - If output language is "Hindi", provide fluent Hindi in Devanagari script.
   - If output language is "English", provide clear, natural English.
5. "simple_explanation": Provide a concise, plain-language breakdown of what the sign/notice means in everyday words that anyone can understand immediately.
6. "action_to_take": Give ONE concrete, immediate, and safe next action specifically tailored to the user's role ("${context}"). ${userQuestionText ? `Directly address the user's question ("${userQuestionText}") within this action and explanation.` : ""}
7. "urgency" guidelines:
   - "low": Information only (e.g., directional sign, restroom locator, welcome notice, general announcement)
   - "medium": Important instruction (e.g., quiet hours, queue rules, dress code, payment terms)
   - "high": Restriction, warning, possible penalty, fine, or deadline (e.g., tow-away zone, mobile phone ban, late entry prohibition, penalty notice)
   - "critical": Immediate physical danger or emergency (e.g., high voltage, danger of death, emergency exit blocked, hazardous chemicals)
8. "why_it_matters": Explain why following this notice/sign matters and the exact consequence of ignoring it.
9. "safety_note": If there is a genuine physical risk, danger, or hazard, provide a focused safety warning. If there is NO genuine safety hazard, it MUST be exactly: "No special safety warning."
10. Do not make legal, medical, financial, or emergency certainty claims.
11. Return strictly valid JSON adhering to the provided schema.
`;

    // Construct Gemini parts
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
            description: "Exact visible text extracted from the sign image, or 'Unclear text' if unreadable.",
          },
          language_detected: {
            type: Type.STRING,
            description: "The primary language of the text visible on the sign.",
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
            description:
              "Translation of essential sign content into the user's chosen language (Hinglish, Hindi, or English).",
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
            description: "Confidence rating from 0 to 100. Lower than 45 if blurry or unclear.",
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
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: schemaConfig,
      });
    } catch (primaryErr: any) {
      console.warn("Primary model attempt encountered issue, attempting fallback:", primaryErr?.message);
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: schemaConfig,
      });
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsedData = JSON.parse(responseText);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Error analyzing sign:", error);
    const errorMessage =
      error?.message || "An unexpected error occurred while analyzing the sign.";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

async function startServer() {
  // Vite dev middleware for SPA
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SignBridge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
