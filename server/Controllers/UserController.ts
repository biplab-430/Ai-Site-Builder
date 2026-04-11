import {Request,Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../Configs/OpenAi.js';

// user credits
export const getUserCredits=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        if(!userId){
            return res.status(401).json({message:"unauthorized"})
        }
        const user=await prisma.user.findUnique({
            where:{id:userId}
        })
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        res.json({credits:user?.credits})
    }catch (error: any) {
        return res.status(500).json({message:"Internal server error", error:error.message})
    }
}

// create new project
export const CreateUserProject = async (req: Request, res: Response) => {
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
      return res
        .status(403)
        .json({ message: "Insufficient credits" });
    }

    const project = await prisma.websiteProject.create({
      data: {
        name:
          initial_prompt.length > 50
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
        credits: { decrement: 5 },
        totalCreation: { increment: 1 },
      },
    });

    creditsDeducted = true;

    const promptEnhancedResponse =
      await openai.chat.completions.create({
        model: "google/gemma-3-12b-it:free",
        messages: [
          {
            role: "system",
            content: `You are a prompt enhancement specialist...`,
          },
          {
            role: "user",
            content: initial_prompt,
          },
        ],
      });

    const enhancedPrompt =
      promptEnhancedResponse.choices[0].message.content || "";

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

    const codeGenerationResponse =
      await openai.chat.completions.create({
        model: "google/gemma-3-12b-it:free",
        messages: [
          {
            role: "system",
            content: `You are an expert web developer...`,
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
      });

    const rawCode =
      codeGenerationResponse.choices[0].message.content;

    if (!rawCode) {
      throw new Error("Code generation failed");
    }

    const cleanedCode = rawCode
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```$/g, "")
      .trim();

    const version = await prisma.version.create({
      data: {
        code: cleanedCode,
        description: "Initial Version",
        projectId: project.id,
      },
    });

    await prisma.websiteProject.update({
      where: { id: project.id },
      data: {
        current_code: cleanedCode,
        current_version_index: version.id,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content:
          "Your website is ready! You can preview it and request changes.",
        projectId: project.id,
      },
    });

    return res.json({ projectId: project.id });

  } catch (error: any) {
    if (creditsDeducted) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } },
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


// to get a single project
export const getUserProject=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        if(!userId){
            return res.status(401).json({message:"unauthorized"})
        }
        const {projectId}=req.params;
       const project=await prisma.websiteProject.findUnique({
       where:{id:projectId,userId:userId},
       include:{
        conversation:{
            orderBy:{timestamp:'asc'}
        },
        versions:{
            orderBy:{timestamp:'asc'}
        }
       }

       })
       res.json({project})
    }catch (error: any) {
        return res.status(500).json({message:"Internal server error", error:error.message})
    }
}

// to get all users project
export const getUserAllProjects=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        if(!userId){
            return res.status(401).json({message:"unauthorized"})
        }

       

       const projects=await prisma.websiteProject.findMany({
       where:{userId:userId},
      orderBy:{updatedAt:'desc'},

       })
       res.json({projects})
    }catch (error: any) {
        return res.status(500).json({message:"Internal server error", error:error.message})
    }
}

// toggle project publish

export const toggleProjectPublish=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        if(!userId){
            return res.status(401).json({message:"unauthorized"})
        }
        const {projectId}=req.params;

       const project=await prisma.websiteProject.findUnique({
       where:{id:projectId,userId:userId},
       })
       if(!project){
        return res.status(404).json({message:'project not found'})
       }
       await prisma.websiteProject.update({
       where:{id:projectId},
       data:{
        isPublished:!project.isPublished
       }
       })

       res.json({message:project.isPublished?'project Unpublished Successfully':'project Published Successfully'})

    }catch (error: any) {
        return res.status(500).json({message:"Internal server error", error:error.message})
    }
}
// to purchase credits

export const purchaseCredits=async(req:Request,res:Response)=>{
    try {
      

    }catch (error: any) {
        return res.status(500).json({message:"Internal server error", error:error.message})
    }
}

// 