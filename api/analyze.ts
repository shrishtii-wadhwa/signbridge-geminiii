import { processSignAnalysis, ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH } from "../server/analyzeService";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Please send a POST request.",
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const inputText = typeof body.inputText === "string" ? body.inputText.trim() : "";
    const hasInputText = inputText.length > 0;
    const hasImage = Boolean(body.image);

    if (!hasImage && !hasInputText) {
      return res.status(400).json({
        error: "Add a photo or paste text before continuing.",
      });
    }

    if (hasInputText && inputText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: "Input text exceeds the maximum allowed length of 5000 characters.",
      });
    }

    const data = await processSignAnalysis({
      image: body.image,
      mimeType: body.mimeType,
      inputText: hasInputText ? inputText : undefined,
      userQuestion: body.userQuestion,
      outputLanguage: body.outputLanguage || body.language || "Hinglish",
      userContext: body.userContext || body.context || "Traveler",
    });

    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.statusCode === 400) {
      return res.status(400).json({
        error: error.message || "Invalid input provided.",
      });
    }

    return res.status(500).json({
      error: "Unable to analyze this input right now. Please try again with a clearer image or pasted text.",
    });
  }
}
