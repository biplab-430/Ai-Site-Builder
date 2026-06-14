import { GoogleGenAI } from '@google/genai';

// 1. Initialize both clients with their respective keys
const primaryClient = new GoogleGenAI({
  apiKey: process.env.AI_API_KEY,
});

const fallbackClient = new GoogleGenAI({
  apiKey: process.env.AI_API_KEY_FINAL,
});

// Debugging logs to verify env variables are loaded
console.log("Primary AI_API_KEY exists:", !!process.env.AI_API_KEY);
console.log("Fallback AI_API_KEY_FINAL exists:", !!process.env.AI_API_KEY_FINAL);

// Helper to determine if an error is a limit/busy issue
const isRateLimitOrBusy = (error: any) => {
  const status = error?.status || error?.response?.status;
  // 429: Too Many Requests (Quota/Limit reached)
  // 503: Service Unavailable (Model overloaded)
  // 500: Internal Server Error (Sometimes thrown during high load)
  return status === 429 || status === 503 || status === 500;
};

// 2. Export a custom wrapper that mimics the SDK structure
const ai = {
  models: {
    generateContent: async (params: any) => {
      try {
        // Attempt with the primary key first
        return await primaryClient.models.generateContent(params);
      } catch (error: any) {
        
        // Check if the error is a rate limit AND if we have a fallback key available
        if (isRateLimitOrBusy(error) && process.env.AI_API_KEY_FINAL) {
          console.warn(`[API Key Fallback] Primary key failed (Status: ${error?.status}). Switching to backup key...`);
          
          // Attempt the exact same request with the secondary key
          return await fallbackClient.models.generateContent(params);
        }

        // If it's a different error (like 400 Bad Request) or the backup also fails, throw it back to your controller
        throw error;
      }
    }
  }
};

export default ai;