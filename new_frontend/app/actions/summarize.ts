'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function processDocument(text: string) {
  const { object } = await generateObject({
    model: google('gemini-3-flash'), // Best for free tier speed
    schema: z.object({
      summary: z.string().describe("A 2-sentence summary of the document"),
      graphData: z.array(z.object({
        label: z.string().describe("The name of the data point (e.g., month, category)"),
        value: z.number().describe("The numerical value for the graph")
      }))
    }),
    prompt: `Summarize the following document and extract key data points for a graph: \n\n${text}`,
  });

  return object;
}