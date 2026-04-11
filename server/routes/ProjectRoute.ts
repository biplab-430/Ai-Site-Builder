import  express  from "express";
import { protect } from "../Middlewares/auth.js";
import { deleteProject, getProjectById, getProjectPreview, getPublishProject, makeRevision, rollBackToVersion, saveProjectCode } from "../Controllers/ProjectController.js";
const projectRouter=express.Router();

projectRouter.post('/revision/:projectId',protect,makeRevision)
projectRouter.put('/save/:projectId',protect,saveProjectCode)
projectRouter.put('/rollback/:projectId/:versionId',protect,rollBackToVersion)
projectRouter.delete('/delete/:projectId',protect,deleteProject)
projectRouter.get('/preview/:projectId',protect,getProjectPreview)
projectRouter.get('/published',getPublishProject)
projectRouter.get('/published/:projectId',getProjectById)

export default projectRouter;