// controller func to rev the code
import prisma from "../lib/prisma.js";
import ai from "../Configs/Gemini.js";
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
export const makeRevision = async (req, res) => {
    const userId = req.userId;
    let creditsDeducted = false;
    try {
        const { projectId } = req.params;
        const { message } = req.body;
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!userId || !user) {
            return res.status(401).json({
                message: "unauthorized",
            });
        }
        if (user.credits < 5) {
            return res.status(403).json({
                message: "add more credit",
            });
        }
        if (!message || message.trim() === "") {
            return res.status(400).json({
                message: "please enter a valid prompt",
            });
        }
        const currentProject = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId,
            },
            include: {
                versions: true,
            },
        });
        if (!currentProject) {
            return res.status(404).json({
                message: "project not found",
            });
        }
        await prisma.conversation.create({
            data: {
                role: "user",
                content: message,
                projectId,
            },
        });
        await prisma.user.update({
            where: { id: userId },
            data: {
                credits: {
                    decrement: 5,
                },
            },
        });
        creditsDeducted = true;
        // STEP 1: Enhance Prompt
        const enhancedPromptResponse = await generateWithFallbackAndRetry(`User request: ${message}`, `
You are a prompt enhancement specialist.

The user wants to modify an existing website.

Enhance this by:
1. Being specific about what elements to change.
2. Mentioning design details.
3. Clarifying the desired outcome.
4. Using clear technical terms.

Return ONLY the enhanced request.
`);
        const enhancedPrompt = enhancedPromptResponse.text?.trim() || "";
        if (!enhancedPrompt) {
            throw new Error("Prompt enhancement failed");
        }
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId,
            },
        });
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: "Now making changes to your website...",
                projectId,
            },
        });
        // STEP 2: Generate Updated Website
        const codeGenerationResponse = await generateWithFallbackAndRetry(`
CURRENT WEBSITE:

${currentProject.current_code}

REQUESTED CHANGES:

${enhancedPrompt}
`, `
You are an expert frontend web developer.

Requirements:
- Return ONLY a complete HTML document.
- Start with <!DOCTYPE html>.
- Preserve all existing functionality.
- Apply the requested changes.
- Use Tailwind CSS.
- Include all JavaScript inside script tags.
- Make the design responsive.
- Do not explain anything.
- Do not use markdown.
- Do not wrap code in triple backticks.
`);
        const code = codeGenerationResponse.text?.trim() || "";
        if (!code) {
            await prisma.conversation.create({
                data: {
                    role: "assistant",
                    content: "Unable to generate the code. Please try again later.",
                    projectId,
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
            creditsDeducted = false;
            return res.status(500).json({
                success: false,
                message: "Code generation failed",
            });
        }
        const cleanedCode = code
            .replace(/```html/gi, "")
            .replace(/```/g, "")
            .trim();
        const version = await prisma.version.create({
            data: {
                code: cleanedCode,
                description: "changes made",
                projectId,
            },
        });
        await prisma.websiteProject.update({
            where: {
                id: projectId,
            },
            data: {
                current_code: cleanedCode,
                current_version_index: version.id,
            },
        });
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: "I have made the changes to your website! You can now preview it.",
                projectId,
            },
        });
        return res.status(200).json({
            success: true,
            message: "changes made successfully",
            versionId: version.id,
        });
    }
    catch (error) {
        console.error("Revision Error:", error);
        if (creditsDeducted && userId) {
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        credits: {
                            increment: 5,
                        },
                    },
                });
            }
            catch (refundError) {
                console.error("Refund Failed:", refundError);
            }
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error instanceof Error
                ? error.message
                : "Unknown error",
        });
    }
};
// we can roll back to our specific version
export const rollBackToVersion = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        const { projectId, versionId } = req.params;
        if (!projectId || !versionId) {
            return res
                .status(400)
                .json({ message: "projectId and versionId are required" });
        }
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: { versions: true }
        });
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        const version = project.versions.find(v => v.id === versionId);
        if (!version) {
            return res
                .status(404)
                .json({ message: "version not found for this project" });
        }
        /* ---------------- Rollback ---------------- */
        await prisma.websiteProject.update({
            where: { id: projectId, userId },
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        });
        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: `Website rolled back to selected version "${version.id}".`,
                projectId
            }
        });
        return res.json({
            message: "rollback successful",
            versionId: version.id
        });
    }
    catch (error) {
        console.error(error.code);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
// to delete a project
export const deleteProject = async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        await prisma.websiteProject.delete({
            where: { id: projectId, userId },
        });
        res.json({ message: `project deleted successfully` });
    }
    catch (error) {
        console.error(error.code);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
// to preview the project
export const getProjectPreview = async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId, userId },
            include: { versions: true }
        });
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        res.json({ project });
    }
    catch (error) {
        console.error(error.code);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
// get publish project
export const getPublishProject = async (req, res) => {
    try {
        const projects = await prisma.websiteProject.findMany({
            where: { isPublished: true },
            include: { user: true }
        });
        res.json({ projects });
    }
    catch (error) {
        console.error(error.code);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
// get a single project by id
export const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId },
            include: { user: true }
        });
        if (!project || project.isPublished === false || !project.current_code) {
            return res.status(404).json({ message: "project not found" });
        }
        res.json({ code: project.current_code });
    }
    catch (error) {
        console.error(error.code);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
// controller to save the project
export const saveProjectCode = async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        const { code } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "unauthorized" });
        }
        if (!code) {
            return res.status(400).json({ message: "code is required" });
        }
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
        });
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        await prisma.websiteProject.update({
            where: { id: projectId, },
            data: {
                current_code: code, current_version_index: ''
            }
        });
        res.json({ message: `project saved successdully` });
    }
    catch (error) {
        console.error(error.code);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
