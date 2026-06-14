import {Request,Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../Configs/OpenAi.js';
import ai from '../Configs/Gemini.js';
import {searchPexelsImages} from '../lib/helperImage.js'

export const generateWithFallbackAndRetry = async (
  contents: string,
  systemInstruction: string,
  retries = 3
) => {
  // Define your model hierarchy (preferred first, fallbacks next)
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ];

  // Outer Loop: Iterate through the available models
  for (const model of models) {
    console.log(`\n--- Activating model: ${model} ---`);

    // Inner Loop: Handle retries for the currently selected model
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // If successful, this returns the payload and exits both loops
        return await ai.models.generateContent({
          model,
          config: { systemInstruction },
          contents,
        });

      } catch (error: any) {
        console.error(`[${model}] Attempt ${attempt} failed.`);
        console.error("Status:", error?.status);
        console.error("Message:", error?.message);

        // Scenario A: Transient Error (503). Wait and retry the SAME model.
        if (error?.status === 503 && attempt < retries) {
          const delayMs = attempt * 3000;
          console.log(`Applying backoff. Waiting ${delayMs}ms before retrying ${model}...`);
          
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue; // Skips to the next iteration of the inner loop
        }

        // Scenario B: Fatal Error (400, 429) OR retries are exhausted.
        // Break out of the inner retry loop to switch to the NEXT model.
        console.warn(`Abandoning ${model}. Switching to next fallback in queue...`);
        break; 
      }
    }
  }

  // If the code execution reaches this point, all models and all retries have failed.
  throw new Error("Critical Failure: All models and retry attempts have been exhausted.");
};