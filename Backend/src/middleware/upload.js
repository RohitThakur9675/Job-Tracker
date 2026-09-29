import multer from "multer";

export const RESUME_MAX_BYTES = (Number(process.env.RESUME_MAX_SIZE_MB) || 5) * 1024 * 1024;
export const PHOTO_MAX_BYTES = (Number(process.env.PHOTO_MAX_SIZE_MB) || 3) * 1024 * 1024;

const storage = multer.memoryStorage();

function pdfOnly(_req, file, cb) {
  const looksLikePdf = file.mimetype === "application/pdf" && /\.pdf$/i.test(file.originalname);
  if (!looksLikePdf) {
    const err = new Error("Resumes must be a PDF file.");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

function imageOnly(_req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    const err = new Error("Profile photo must be a JPG, PNG, or WEBP image.");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

export const resumeUpload = multer({
  storage,
  fileFilter: pdfOnly,
  limits: { fileSize: RESUME_MAX_BYTES, files: 1 },
}).single("resume");

export const photoUpload = multer({
  storage,
  fileFilter: imageOnly,
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
}).single("photo");
