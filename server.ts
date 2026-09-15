import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { processSignAnalysis, ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH } from "./server/analyzeService";

dotenv.config();

const app = express();
const PORT = 3000;

// Multer memory storage for multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

// Support base64 image uploads up to 15MB payload for JSON payloads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ status: "ok", service: "SignBridge API" });
});

// POST /api/analyze - Multipart FormData endpoint
app.post("/api/analyze", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");

  upload.single("image")(req, res, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Image file exceeds the maximum allowed size of 10 MB.",
        });
      }
      return res.status(400).json({
        error: "Add a photo or paste text before continuing.",
      });
    }

    try {
      const imageFile = req.file;
      const inputText = typeof req.body.inputText === "string" ? req.body.inputText.trim() : "";
      const userQuestion = typeof req.body.userQuestion === "string" ? req.body.userQuestion.trim() : "";
      const outputLanguage = req.body.outputLanguage || req.body.language || "Hinglish";
      const userContext = req.body.userContext || req.body.context || "Traveler";

      const hasImage = Boolean(imageFile && imageFile.size > 0);
      const hasInputText = inputText.length > 0;

      if (hasImage && imageFile) {
        if (!ALLOWED_MIME_TYPES.includes(imageFile.mimetype.toLowerCase())) {
          return res.status(400).json({
            error: "Invalid image type. Only JPEG, PNG, and WebP are allowed.",
          });
        }
      }

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

      const result = await processSignAnalysis({
        imageBuffer: imageFile?.buffer,
        imageMimeType: imageFile?.mimetype,
        inputText: hasInputText ? inputText : undefined,
        userQuestion: userQuestion.length > 0 ? userQuestion : undefined,
        outputLanguage,
        language: outputLanguage,
        userContext,
        context: userContext,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("SignBridge API error:", error?.message || error);
      if (error?.statusCode === 400) {
        return res.status(400).json({
          error: error.message || "Invalid input provided.",
        });
      }

      return res.status(500).json({
        error:
          "Unable to analyze this input right now. Please try again with a clearer image or pasted text.",
      });
    }
  });
});

// Legacy / fallback endpoint
app.post("/api/analyze-sign", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const data = await processSignAnalysis(req.body);
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error?.message || "An unexpected error occurred while analyzing the sign.",
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
