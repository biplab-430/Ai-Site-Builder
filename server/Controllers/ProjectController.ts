// controller func to rev the code

import prisma from "../lib/prisma.js";
import {Request,Response} from 'express'
import openai from '../Configs/OpenAi.js';

export const makeRevision=async(req:Request,res:Response)=>{
    const userId=req.userId;
    try {

        const {projectId}=req.params;
        const {message}=req.body;

          const user=await prisma.user.findUnique({
            where:{id:userId}
        })
        
        if(!userId || user){
            return res.status(401).json({message:"unauthorized"})
        }

      if(user.credits<5){
            return res.status(403).json({message:"add more credit"})
        }
      if(!message || message.trim()===''){
           return res.status(400).json({message:"please enter a valid prompt"})
        
      }
      const currentProject=await prisma.websiteProject.findUnique({
        where:{id:projectId,userId},
        include:{versions:true}

      })
      if(!currentProject){
          return res.status(404).json({message:"project not found"})
      }
      await prisma.conversation.create({
        data:{
            role:'user',
            content:message,
            projectId
        }
      })
      await prisma.user.update({
        where:{id:userId},
        data:{credits:{decrement:5}}
      })
      const enhancedPromptResponse=await openai.chat.completions.create({
            model:"google/gemma-3-12b-it:free",
            messages:[
                {
                    role:'system',
                    content:`
                    
You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

    Enhance this by:
    1. Being specific about what elements to change
    2. Mentioning design details (colors, spacing, sizes)
    3. Clarifying the desired outcome
    4. Using clear technical terms

Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).
`
                },
                {
                    role:'user',
                    content:`User's request :${message}`
                }
            ]
      })
      const enhancedPrompt=enhancedPromptResponse.choices[0].message.content;
      await prisma.conversation.create({
        data:{
            role:'assistant',
            content:`I've enhanced your prompt to :"${enhancedPrompt}"`,
            projectId
        }
      })
      await prisma.conversation.create({
        data:{
            role:'assistant',
            content:`Nowmaking changes to your website....`,
            projectId
        }
      })
      const codeGenerationResponse=await openai.chat.completions.create({
             model:"google/gemma-3-12b-it:free",
              messages:[
                {
                    role:'system',
                    content:`
You are an expert web developer. 

    CRITICAL REQUIREMENTS:
    - Return ONLY the complete updated HTML code with the requested changes.
    - Use Tailwind CSS for ALL styling (NO custom CSS).
    - Use Tailwind utility classes for all styling changes.
    - Include all JavaScript in <script> tags before closing </body>
    - Make sure it's a complete, standalone HTML document with Tailwind CSS
    - Return the HTML Code Only, nothing else

    Apply the requested changes while maintaining the Tailwind CSS styling approach.
`
                }, {
                    role:'user',
                    content:`Here is the current website code:"${currentProject.current_code}" This user wants this change :"${enhancedPrompt}"`
                }
              ]
      })

      const code=codeGenerationResponse.choices[0].message.content|| '';
      if(!code){
          await prisma.conversation.create({
        data:{
            role:'assistant',
            content:'unable to generate the code please try again',
            projectId
        }
    })  
    await prisma.user.update({
        where:{id:userId},
        data:{credits:{increment:5}}
      })
      return;
      }
      const version=await prisma.version.create({ 
        data:{
        code:code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g,'')
        .trim(),
        description:'changes made',
        projectId
    }})
  
    await prisma.conversation.create({
        data:{
            role:'assistant',
            content:'i have made the changes to your website! you can now preview it',
            projectId
        }
    })

    await prisma.websiteProject.update({
        where:{id:projectId},
        data:{
            current_code:code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g,'')
        .trim(),
          current_version_index:version.id
        }
    })

        res.json({message:`changes made successfully`})
    }catch (error: any) {
          await prisma.user.update({
        where:{id:userId},
        data:{credits:{increment:5}}
      })
        return res.status(500).json({message:"Internal server error", error:error.message})
    }
}

// we can roll back to our specific version

export const rollBackToVersion = async (req: Request, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({ message: "unauthorized" })
    }

    const { projectId, versionId } = req.params

    if (!projectId || !versionId) {
      return res
        .status(400)
        .json({ message: "projectId and versionId are required" })
    }

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: { versions: true }
    })

    if (!project) {
      return res.status(404).json({ message: "project not found" })
    }

    const version = project.versions.find(v => v.id === versionId)

    if (!version) {
      return res
        .status(404)
        .json({ message: "version not found for this project" })
    }

    /* ---------------- Rollback ---------------- */

   await prisma.websiteProject.update({
    where:{id:projectId,userId},
    data:{
      current_code:version.code,
      current_version_index:version.id
    }
   })

      await prisma.conversation.create({
         data: {
          role: "assistant",
          content: `Website rolled back to selected version "${version.id}".`,
          projectId
        }
      })

    return res.json({
      message: "rollback successful",
      versionId: version.id
    })
  } catch (error: any) {
    console.error(error.code)

    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    })
  }
}

// to delete a project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { projectId } = req.params

    if (!userId) {
      return res.status(401).json({ message: "unauthorized" })
    }


   

     await prisma.websiteProject.delete({
      where: { id: projectId, userId },
     
    })

   res.json({message:`project deleted successfully`})
    
   
  } catch (error: any) {
    console.error(error.code)

    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    })
  }
}
// to preview the project
export const getProjectPreview = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    const { projectId } = req.params

    if (!userId) {
      return res.status(401).json({ message: "unauthorized" })
    }

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
      include:{versions:true}
    })

    if (!project) {
      return res.status(404).json({ message: "project not found" })
    }

    res.json({ project })
  } catch (error: any) {
    console.error(error.code)

    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    })
  }
}

// get publish project
export const getPublishProject=async(req: Request, res: Response)=>{
  try {
    const projects = await prisma.websiteProject.findMany({
      where: { isPublished:true },
     include:{user:true}
    })

   res.json({projects})

  } catch (error: any) {
    console.error(error.code)

    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    })
  }
}
// get a single project by id
export const getProjectById=async(req: Request, res: Response)=>{
  try {
    const { projectId } = req.params
    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
      include:{user:true}
    })
     if (!project || project.isPublished===false || !project.current_code) {
      return res.status(404).json({ message: "project not found" })
    }

   res.json({code:project.current_code})

  } catch (error: any) {
    console.error(error.code)

    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    })
  }
}

// controller to save the project
export const saveProjectCode=async(req: Request, res: Response)=>{
  try {
    const userId=req.userId;
    const { projectId } = req.params
    const{code }=req.body;
    
   if (!userId) {
      return res.status(401).json({ message: "unauthorized" })
    }
    if(!code){
      return res.status(400).json({ message: "code is required" })
    }
   const project = await prisma.websiteProject.findUnique({
      where: { id: projectId, userId },
     
    })
    if(!project){
       return res.status(404).json({ message: "project not found" })
    }
  await prisma.websiteProject.update({
    where:{id:projectId,},
    data:{
      current_code:code,current_version_index:''
    }
  })

   res.json({message:`project saved successdully`})

  } catch (error: any) {
    console.error(error.code)

    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    })
  }
}