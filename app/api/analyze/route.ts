import { processSignAnalysis, ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH } from "../../../server/analyzeService";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { error: "Add a photo or paste text before continuing." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const imageEntry = formData.get("image");
    const inputTextEntry = formData.get("inputText");
    const outputLanguage = (formData.get("outputLanguage") as string) || "Hinglish";
    const userContext = (formData.get("userContext") as string) || "Traveler";
    const userQuestion = (formData.get("userQuestion") as string) || "";

    const inputText = typeof inputTextEntry === "string" ? inputTextEntry.trim() : "";
    const hasInputText = inputText.length > 0;

    let imageBuffer: Buffer | undefined;
    let imageMimeType: string | undefined;
    let hasImage = false;

    if (imageEntry && typeof imageEntry === "object" && "size" in imageEntry && (imageEntry as File).size > 0) {
      const file = imageEntry as File;
      hasImage = true;

      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        return Response.json(
          { error: "Unsupported image type. Only JPEG, PNG, and WebP are allowed." },
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (file.size > MAX_IMAGE_BYTES) {
        return Response.json(
          { error: "Image file exceeds the maximum allowed size of 10 MB." },
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      imageMimeType = file.type;
    }

    // 2. Require at least one of image or inputText
    if (!hasImage && !hasInputText) {
      return Response.json(
        { error: "Add a photo or paste text before continuing." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Validate inputText character limit
    if (hasInputText && inputText.length > MAX_TEXT_LENGTH) {
      return Response.json(
        { error: "Input text exceeds the maximum allowed length of 5000 characters." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Call Gemini server-side
    const result = await processSignAnalysis({
      imageBuffer,
      imageMimeType,
      inputText: hasInputText ? inputText : undefined,
      userQuestion: userQuestion.trim() || undefined,
      outputLanguage,
      language: outputLanguage,
      userContext,
      context: userContext,
    });

    return Response.json(result, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error?.statusCode === 400) {
      return Response.json(
        { error: error.message || "Invalid input provided." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Never return raw Gemini errors or plain text
    return Response.json(
      {
        error:
          "Unable to analyze this input right now. Please try again with a clearer image or pasted text.",
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
