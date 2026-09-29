import jwt from "jsonwebtoken";
import { config } from "../config.js";

// The token carries the user's id (as the JWT "subject") and role, so every
// protected route can check permissions without an extra database lookup.
export function signToken(userId, role) {
  return jwt.sign({ role }, config.jwtSecret, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: config.jwtExpiresIn,
  });
}

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    // expired, tampered, wrong secret ... all look the same to the client
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

// Use after requireAuth to restrict a route to specific roles, e.g.
//   router.post("/", requireAuth, requireRole("recruiter", "admin"), ...)
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    next();
  };
}
