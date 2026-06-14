import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
    apiKey: process.env.AI_API_KEY,
});
console.log("AI_API_KEY exists:", !!process.env.AI_API_KEY);
console.log("AI_API_KEY prefix:", process.env.AI_API_KEY?.substring(0, 10));
export default ai;
