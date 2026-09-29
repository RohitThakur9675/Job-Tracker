import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as savedJobController from "../controllers/savedJobController.js";

const router = Router();
router.use(requireAuth, requireRole("jobseeker"));

router.get("/", savedJobController.listSavedJobs);
router.post("/", savedJobController.saveJob);
router.delete("/:jobId", savedJobController.unsaveJob);

export default router;
