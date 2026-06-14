import prisma from '../lib/prisma.js';
import ai from '../Configs/Gemini.js';
import { searchPexelsImages } from '../lib/helperImage.js';
export const generateWithFallbackAndRetry = async (contents, systemInstruction, retries = 3) => {
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
            }
            catch (error) {
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
// user credits
export const getUserCredits = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ credits: user?.credits });
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
// create new project
export const CreateUserProject = async (req, res) => {
    const userId = req.userId;
    let creditsDeducted = false;
    try {
        const { initial_prompt } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!initial_prompt || typeof initial_prompt !== "string") {
            return res.status(400).json({ message: "Invalid prompt" });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || user.credits < 5) {
            return res.status(403).json({
                message: "Insufficient credits",
            });
        }
        const project = await prisma.websiteProject.create({
            data: {
                name: initial_prompt.length > 50
                    ? initial_prompt.substring(0, 47) + "..."
                    : initial_prompt,
                initial_prompt,
                userId,
            },
        });
        await prisma.conversation.create({
            data: {
                role: "user",
                content: initial_prompt,
                projectId: project.id,
            },
        });
        await prisma.user.update({
            where: { id: userId },
            data: {
                credits: {
                    decrement: 5,
                },
                totalCreation: {
                    increment: 1,
                },
            },
        });
        creditsDeducted = true;
        // STEP 1: Enhance Prompt
        const promptEnhancedResponse = await generateWithFallbackAndRetry(initial_prompt, `
You are a professional prompt enhancement specialist.

Your task:
- Improve the user's website idea.
- Add missing UI/UX details.
- Add relevant sections and features.
- Improve design requirements.
- Make the prompt detailed and production-ready.

Return ONLY the enhanced prompt.
`);
        const enhancedPrompt = promptEnhancedResponse.text?.trim() || "";
        if (!enhancedPrompt) {
            throw new Error("Prompt enhancement failed");
        }
        // for image generation properly 
        const imageKeywordResponse = await generateWithFallbackAndRetry(enhancedPrompt, `
Return ONLY one highly specific image search keyword.

Examples:
Restaurant website -> restaurant food
Gym website -> fitness gym
Travel website -> travel tourism
Portfolio website -> software developer

Return only the keyword.
`);
        const imageKeyword = imageKeywordResponse.text?.trim() || "business";
        const imageUrls = await searchPexelsImages(imageKeyword, 8);
        console.log("Image Keyword:", imageKeyword);
        console.log("Pexels Images:", imageUrls);
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: enhancedPrompt,
                projectId: project.id,
            },
        });
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: "Now generating your website...",
                projectId: project.id,
            },
        });
        // STEP 2: Generate Website Code
        const codeGenerationResponse = await generateWithFallbackAndRetry(enhancedPrompt, `
You are an expert frontend web developer.

AVAILABLE IMAGES:

${imageUrls
            .map((url, index) => `Image ${index + 1}: ${url}`)
            .join("\n")}

Requirements:

- Return ONLY a complete HTML document starting with <!DOCTYPE html>.
- Include all CSS inside <style> tags.
- Include all JavaScript inside <script> tags.
- Create a modern responsive design.
- Use clean semantic HTML and modern CSS.
- Add animations when appropriate.

IMAGE RULES:
- Use ONLY the provided image URLs.
- Hero section MUST use Image 1.
- Other sections should use the remaining images.
- Never use picsum.photos.
- Never use placehold.co.
- Never invent image URLs.
- Never use local file paths.

- Do not explain anything.
- Do not use markdown.
- Do not wrap code in triple backticks.
- Output must be directly renderable in a browser.
`);
        const rawCode = codeGenerationResponse.text?.trim();
        if (!rawCode) {
            await prisma.conversation.create({
                data: {
                    role: "assistant",
                    content: "unable to generate the code please try again later",
                    projectId: project.id
                },
            });
            await prisma.user.update({
                where: { id: userId },
                data: {
                    credits: {
                        increment: 5,
                    },
                },
            });
            return;
        }
        const cleanedCode = rawCode
            .replace(/```html/gi, "")
            .replace(/```/g, "")
            .trim();
        const version = await prisma.version.create({
            data: {
                code: cleanedCode,
                description: "Initial Version",
                projectId: project.id,
            },
        });
        await prisma.websiteProject.update({
            where: {
                id: project.id,
            },
            data: {
                current_code: cleanedCode,
                current_version_index: version.id,
            },
        });
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: "Your website is ready! You can preview it and request changes.",
                projectId: project.id,
            },
        });
        return res.status(200).json({
            success: true,
            projectId: project.id,
            versionId: version.id,
        });
    }
    catch (error) {
        console.error("Create Project Error:", error);
        if (creditsDeducted && userId) {
            try {
                await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        credits: {
                            increment: 5,
                        },
                    },
                });
            }
            catch (refundError) {
                console.error("Credit Refund Failed:", refundError);
            }
        }
        return res.status(error?.status === 503 ? 503 : 500).json({
            success: false,
            message: error?.status === 503
                ? "AI service is currently busy. Please try again in a minute."
                : "Internal server error",
            error: error?.message || "Unknown error",
        });
    }
};
// to get a single project
export const getUserProject = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        const { projectId } = req.params;
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId: userId },
            include: {
                conversation: {
                    orderBy: { timestamp: 'asc' }
                },
                versions: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });
        res.json({ project });
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
// to get all users project
export const getUserAllProjects = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        const projects = await prisma.websiteProject.findMany({
            where: { userId: userId },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ projects });
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
// toggle project publish
// export const toggleProjectPublish=async(req:Request,res:Response)=>{
//     try {
//         const userId=req.userId;
//         if(!userId){
//             return res.status(401).json({message:"unauthorized"})
//         }
//         const {projectId}=req.params;
//        const project=await prisma.websiteProject.findUnique({
//        where:{id:projectId,userId:userId},
//        })
//        if(!project){
//         return res.status(404).json({message:'project not found'})
//        }
//        await prisma.websiteProject.update({
//        where:{id:projectId},
//        data:{
//         isPublished:!project.isPublished
//        }
//        })
//        res.json({message:project.isPublished?'project Unpublished Successfully':'project Published Successfully'})
//     }catch (error: any) {
//         return res.status(500).json({message:"Internal server error", error:error.message})
//     }
// }
export const toggleProjectPublish = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        const { projectId } = req.params;
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId: userId },
        });
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        // 1. Capture the newly updated database record
        const updatedProject = await prisma.websiteProject.update({
            where: { id: projectId },
            data: {
                isPublished: !project.isPublished,
            },
        });
        // 2. Evaluate the message based on the NEW state
        res.json({
            message: updatedProject.isPublished
                ? "project Published Successfully"
                : "project Unpublished Successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
// to purchase credits
export const purchaseCredits = async (req, res) => {
    try {
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
// 
