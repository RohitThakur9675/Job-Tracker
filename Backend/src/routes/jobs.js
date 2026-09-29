import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as jobController from "../controllers/jobController.js";

const router = Router();

// Static paths must be registered before "/:id" or Express would treat
// "mine" as a job id.
router.get("/mine", requireAuth, requireRole("recruiter"), jobController.listMyJobs);

router.get("/", jobController.listJobs);
router.get("/:id", jobController.getJob);
router.post("/", requireAuth, requireRole("recruiter", "admin"), jobController.createJob);
router.patch("/:id", requireAuth, requireRole("recruiter", "admin"), jobController.updateJob);
router.delete("/:id", requireAuth, requireRole("recruiter", "admin"), jobController.deleteJob);
router.post("/:id/report", requireAuth, requireRole("jobseeker"), jobController.reportJob);

export default router;
