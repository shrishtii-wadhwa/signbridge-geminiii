import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { processSignAnalysis } from "./server/analyzeService";

dotenv.config();

const app = express();
const PORT = 3000;

// Support base64 image uploads up to 15MB payload
app.use(express.json({ limit: "15mb" }));

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "SignBridge API" });
});

// Analyze sign / notice endpoint (supports Image, Text, or Both)
app.post("/api/analyze-sign", async (req: Request, res: Response) => {
  try {
    const data = await processSignAnalysis(req.body);
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error analyzing sign:", error);
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
