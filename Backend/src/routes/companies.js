import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as companyController from "../controllers/companyController.js";

const router = Router();

router.get("/", companyController.listCompanies);
router.get("/me", requireAuth, requireRole("recruiter"), companyController.getMyCompany);
router.put("/me", requireAuth, requireRole("recruiter"), companyController.upsertMyCompany);
router.get("/:id", companyController.getCompany);

export default router;
