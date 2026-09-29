import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";
import { isEmail } from "../utils/validators.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email doesn't exist, so "unknown email" and "wrong password"
// take the same time and can't be told apart by response timing.
const DUMMY_HASH = bcrypt.hashSync("jobtrack-dummy-password", BCRYPT_ROUNDS);

const asString = (value) => (typeof value === "string" ? value : "");
const badRequest = (res, message) => res.status(400).json({ message });

export async function signup(req, res) {
  const name = asString(req.body?.name).trim();
  const email = asString(req.body?.email).trim().toLowerCase();
  const password = asString(req.body?.password);
  const role = asString(req.body?.role);

  if (!name) return badRequest(res, "Please enter your name.");
  if (!isEmail(email)) return badRequest(res, "Please enter a valid email address.");
  if (password.length < 6) return badRequest(res, "Password must be at least 6 characters.");
  if (Buffer.byteLength(password) > 72) {
    return badRequest(res, "Password must be at most 72 characters."); // bcrypt limit
  }
  // Public signup only ever creates these two roles — "admin" is never selectable here.
  if (!["jobseeker", "recruiter"].includes(role)) {
    return badRequest(res, "Please choose whether you're a job seeker or a recruiter.");
  }

  if (await User.exists({ email })) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role });

  res.status(201).json({ token: signToken(user.id, user.role), user });
}

export async function login(req, res) {
  const email = asString(req.body?.email).trim().toLowerCase();
  const password = asString(req.body?.password);

  if (!email || !password) return badRequest(res, "Email and password are required.");

  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: "This account has been deactivated. Please contact support." });
  }

  res.json({ token: signToken(user.id, user.role), user });
}

export async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });
  res.json({ user });
}
