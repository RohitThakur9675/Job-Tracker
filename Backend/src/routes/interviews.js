import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as interviewController from "../controllers/interviewController.js";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole("recruiter", "admin"), interviewController.scheduleInterview);
router.get("/mine", requireRole("jobseeker"), interviewController.myInterviews);
router.get("/recruiter/mine", requireRole("recruiter", "admin"), interviewController.recruiterInterviews);
router.get("/meeting/:meetingId", interviewController.getMeetingInfo);
router.patch("/:id", requireRole("recruiter", "admin"), interviewController.updateInterview);

export default router;
