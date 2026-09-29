import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import * as authController from "../controllers/authController.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.get("/me", requireAuth, authController.me);

export default router;
