import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as applicationController from "../controllers/applicationController.js";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole("jobseeker"), applicationController.applyToJob);
router.get("/mine", requireRole("jobseeker"), applicationController.myApplications);
router.get("/job/:jobId", requireRole("recruiter", "admin"), applicationController.jobApplicants);
router.get("/recruiter/summary", requireRole("recruiter", "admin"), applicationController.recruiterSummary);
router.get("/:id", applicationController.getApplication);
router.get("/:id/resume/view", applicationController.viewApplicationResume);
router.get("/:id/resume/download", applicationController.downloadApplicationResume);
router.patch("/:id/status", requireRole("recruiter", "admin"), applicationController.updateApplicationStatus);
router.delete("/:id", requireRole("jobseeker"), applicationController.withdrawApplication);

export default router;
