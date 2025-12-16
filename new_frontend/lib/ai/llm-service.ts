// LLM Service for Medical Record Summarization

export interface MedicalSummary {
  diagnosis?: string
  medications?: string[]
  testResults?: Array<{
    test: string
    value: string
    unit?: string
    normalRange?: string
  }>
  recommendations?: string[]
  keyFindings: string[]
}

export async function generateMedicalSummary(recordText: string, recordType: string): Promise<MedicalSummary> {
  // In production, call an actual LLM API (OpenAI, Anthropic, etc.)
  // For this hackathon demo, we'll use a mock implementation

  console.log("[LLM Service] Generating summary for:", recordType)

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock AI-generated summary based on record type
  const mockSummaries: Record<string, MedicalSummary> = {
    "Blood Test": {
      diagnosis: "Routine blood work analysis",
      medications: ["Vitamin D supplement recommended"],
      testResults: [
        {
          test: "Hemoglobin",
          value: "14.5",
          unit: "g/dL",
          normalRange: "13.5-17.5 g/dL",
        },
        {
          test: "WBC Count",
          value: "7.2",
          unit: "×10³/µL",
          normalRange: "4.5-11.0 ×10³/µL",
        },
        {
          test: "Platelet Count",
          value: "250",
          unit: "×10³/µL",
          normalRange: "150-400 ×10³/µL",
        },
        {
          test: "Glucose",
          value: "95",
          unit: "mg/dL",
          normalRange: "70-100 mg/dL",
        },
      ],
      recommendations: ["All values within normal range", "Continue current health regimen", "Follow-up in 6 months"],
      keyFindings: ["Normal hemoglobin levels", "WBC count within acceptable range", "Blood glucose normal"],
    },
    "X-Ray": {
      diagnosis: "Chest X-ray examination",
      keyFindings: [
        "Clear lung fields bilaterally",
        "No signs of consolidation or infiltrates",
        "Cardiac silhouette within normal limits",
        "No evidence of pleural effusion",
      ],
      recommendations: ["No immediate concerns", "Routine follow-up as needed"],
    },
    "MRI Scan": {
      diagnosis: "MRI imaging analysis",
      keyFindings: [
        "No abnormal masses detected",
        "Normal tissue density observed",
        "Vascular structures appear normal",
        "No signs of inflammation",
      ],
      recommendations: ["Results within normal parameters", "No further imaging required at this time"],
    },
    Prescription: {
      diagnosis: "Medication prescription",
      medications: ["Amoxicillin 500mg - Take 3 times daily for 7 days", "Ibuprofen 400mg - As needed for pain"],
      keyFindings: ["Prescribed for bacterial infection treatment", "Pain management support included"],
      recommendations: [
        "Complete full course of antibiotics",
        "Take with food to avoid stomach upset",
        "Contact physician if symptoms worsen",
      ],
    },
    "Lab Report": {
      diagnosis: "Laboratory test analysis",
      testResults: [
        {
          test: "Creatinine",
          value: "1.0",
          unit: "mg/dL",
          normalRange: "0.7-1.3 mg/dL",
        },
        {
          test: "ALT",
          value: "25",
          unit: "U/L",
          normalRange: "7-56 U/L",
        },
        {
          test: "AST",
          value: "28",
          unit: "U/L",
          normalRange: "10-40 U/L",
        },
      ],
      keyFindings: ["Kidney function normal", "Liver enzymes within acceptable range"],
      recommendations: ["Results satisfactory", "Continue current treatment plan"],
    },
  }

  // Return mock summary based on record type, or generic summary
  return (
    mockSummaries[recordType] || {
      diagnosis: `Analysis of ${recordType}`,
      keyFindings: [
        "AI-generated summary available",
        "Report has been processed and analyzed",
        "Results stored securely",
      ],
      recommendations: ["Consult with healthcare provider for detailed interpretation"],
    }
  )
}

export function extractTextFromFile(fileName: string, fileType: string): string {
  // In production, use OCR or PDF parsing libraries
  // For demo purposes, return mock extracted text
  return `Mock extracted text from ${fileName} (${fileType})`
}
