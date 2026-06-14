import express from 'express'
import { CreateUserProject, getConversation, getUserAllProjects, getUserCredits, getUserProject, purchaseCredits, toggleProjectPublish } from '../Controllers/UserController.js';
import { protect } from '../Middlewares/auth.js';

const userRouter=express.Router();

userRouter.get('/credits',protect, getUserCredits)
userRouter.post('/project',protect,CreateUserProject)
userRouter.get('/project/:projectId',protect,getUserProject)
userRouter.get('/projects',protect, getUserAllProjects)
userRouter.put('/publish-toggle/:projectId',protect, toggleProjectPublish)
userRouter.post('/purchase-credits',protect, purchaseCredits)
userRouter.get('/convo/:projectId',protect, getConversation)

export default userRouter;