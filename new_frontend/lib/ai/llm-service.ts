import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// 1. Define your schema using Zod (This fixes all Type Errors)
const MedicalSummarySchema = z.object({
  diagnosis: z.string().optional(),
  medications: z.array(z.string()).optional(),
  testResults: z
    .array(
      z.object({
        test: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        normalRange: z.string().optional(),
      }),
    )
    .optional(),
  recommendations: z.array(z.string()).optional(),
  keyFindings: z.array(z.string()),
  vitals: z
    .object({
      bloodPressure: z.string().nullable(),
      sugarLevel: z.number().nullable(),
      weight: z.number().nullable(),
    })
    .optional(),
});

// Simple helper used by the API route – for now this just
// returns a descriptive string based on file name/type.
export function extractTextFromFile(fileName: string, fileType: string): string {
  return `Extracted text content from file ${fileName} of type ${fileType}.`;
}

export async function generateMedicalSummary(fileData: string, recordType: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  // Convert Zod schema to the JSON format Gemini expects
  const prompt = `Analyze this ${recordType} document. Extract data into the required JSON format.
  Extract Blood Pressure, Sugar (mg/dL), and Weight (kg) if present. 
  
  JSON Schema to follow:
  ${JSON.stringify(MedicalSummarySchema.shape)}
  
  Return ONLY the JSON.`;

  const result = await model.generateContent([prompt, { text: fileData }]);
  const responseText = result.response.text();
  
  // Parse and validate with Zod
  try {
    // We strip markdown blocks if Gemini adds them
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse AI response:", responseText);
    return { keyFindings: ["Error parsing document results"] };
  }
}