import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// 1. Define your schema using Zod (This fixes all Type Errors)
const MedicalSummarySchema = z.object({
  diagnosis: z.string().optional(),
  medications: z.array(z.string()).optional(),
  testResults: z.array(z.object({
    test: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    normalRange: z.string().optional()
  })).optional(),
  recommendations: z.array(z.string()).optional(),
  keyFindings: z.array(z.string()),
  vitals: z.object({
    bloodPressure: z.string().nullable(),
    sugarLevel: z.number().nullable(),
    weight: z.number().nullable(),
  }).optional()
});

export async function generateMedicalSummary(fileData: string, fileType: string, recordType: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  // Convert Zod schema to the JSON format Gemini expects
  const prompt = `Analyze this ${recordType} document. Extract data into the required JSON format.
  Extract Blood Pressure, Sugar (mg/dL), and Weight (kg) if present. 
  
  JSON Schema to follow:
  ${JSON.stringify(MedicalSummarySchema.shape)}
  
  Return ONLY the JSON.`;

  // Handle the file data
  const isBase64 = fileData.startsWith('data:');
  const part = isBase64 
    ? { inlineData: { data: fileData.split(',')[1], mimeType: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg' } }
    : { text: fileData };

  const result = await model.generateContent([prompt, part]);
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