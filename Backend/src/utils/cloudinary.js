import crypto from "node:crypto";
import path from "node:path";

export function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
    err.status = 503;
    throw err;
  }
  return { cloudName, apiKey, apiSecret };
}

function signParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(serialized + apiSecret).digest("hex");
}

function safeBaseName(originalName) {
  return path
    .basename(originalName || "file")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
}

export function buildResumePublicId(userId, originalName) {
  return `jobtrack/resumes/${userId}/${crypto.randomUUID()}-${safeBaseName(originalName)}.pdf`;
}

export function buildPhotoPublicId(userId) {
  return `jobtrack/profile-photos/${userId}/${crypto.randomUUID()}`;
}

async function cloudinaryRequest(resourceType, action, form) {
  const { cloudName } = getConfig();
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/${action}`;
  const response = await fetch(url, { method: "POST", body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    const message = data?.error?.message || `Cloudinary request failed (${response.status}).`;
    const err = new Error(message);
    err.status = response.status >= 500 ? 502 : 400;
    throw err;
  }
  return data;
}

export async function uploadToCloudinary(buffer, { resourceType, publicId, mimeType, originalName }) {
  const { apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const signature = signParams(params, apiSecret);

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), originalName || "upload");
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("signature", signature);

  const data = await cloudinaryRequest(resourceType, "upload", form);
  return {
    publicId: data.public_id || publicId,
    secureUrl: data.secure_url,
    resourceType: data.resource_type || resourceType,
    mimeType: mimeType || "application/octet-stream",
    bytes: Number(data.bytes) || buffer.length,
  };
}

export async function deleteFromCloudinary({ publicId, resourceType }) {
  if (!publicId) return;
  const { apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const signature = signParams(params, apiSecret);

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("invalidate", "true");
  form.append("signature", signature);

  await cloudinaryRequest(resourceType, "destroy", form);
}

export async function streamCloudinaryFile(res, secureUrl, { inline, filename, mimeType }) {
  if (!secureUrl) {
    return res.status(404).json({ message: "This file is no longer available." });
  }

  let response;
  try {
    response = await fetch(secureUrl);
  } catch {
    return res.status(502).json({ message: "Unable to reach file storage. Please try again." });
  }

  if (!response.ok) {
    return res.status(404).json({ message: "This file is no longer available." });
  }

  const safeName = (filename || "resume.pdf").replace(/["\r\n]/g, "");
  res.setHeader("Content-Type", mimeType || response.headers.get("content-type") || "application/octet-stream");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeName}"`);
  res.setHeader("Cache-Control", "private, no-store");

  const data = Buffer.from(await response.arrayBuffer());
  res.end(data);
}
