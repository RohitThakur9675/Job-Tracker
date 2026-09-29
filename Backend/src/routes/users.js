import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { resumeUpload, photoUpload } from "../middleware/upload.js";
import * as userController from "../controllers/userController.js";

const router = Router();
router.use(requireAuth);

router.patch("/me", userController.updateMe);
router.get("/:id/profile", userController.getPublicProfile);

router.post("/me/photo", photoUpload, userController.uploadPhoto);
router.delete("/me/photo", userController.deletePhoto);

router.post("/me/resume", requireRole("jobseeker"), resumeUpload, userController.uploadResume);
router.delete("/me/resume", requireRole("jobseeker"), userController.deleteResume);
router.get("/me/resume/view", requireRole("jobseeker"), userController.viewResume);
router.get("/me/resume/download", requireRole("jobseeker"), userController.downloadResume);

router.post("/me/education", requireRole("jobseeker"), userController.addEducation);
router.patch("/me/education/:entryId", requireRole("jobseeker"), userController.updateEducation);
router.delete("/me/education/:entryId", requireRole("jobseeker"), userController.deleteEducation);

router.post("/me/experience", requireRole("jobseeker"), userController.addExperience);
router.patch("/me/experience/:entryId", requireRole("jobseeker"), userController.updateExperience);
router.delete("/me/experience/:entryId", requireRole("jobseeker"), userController.deleteExperience);

router.post("/me/projects", requireRole("jobseeker"), userController.addProject);
router.patch("/me/projects/:entryId", requireRole("jobseeker"), userController.updateProject);
router.delete("/me/projects/:entryId", requireRole("jobseeker"), userController.deleteProject);

export default router;
