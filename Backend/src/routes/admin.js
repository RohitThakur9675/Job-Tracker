import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as adminController from "../controllers/adminController.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/stats", adminController.stats);
router.get("/users", adminController.listUsers);
router.patch("/users/:id/active", adminController.setUserActive);
router.get("/companies", adminController.listCompaniesAdmin);
router.patch("/companies/:id/verify", adminController.verifyCompany);
router.get("/jobs", adminController.listAllJobs);
router.post("/jobs", adminController.createJobForCompany);
router.get("/applications", adminController.listAllApplications);
router.get("/reported-jobs", adminController.reportedJobs);
router.patch("/reported-jobs/:id/dismiss", adminController.dismissReport);

export default router;
