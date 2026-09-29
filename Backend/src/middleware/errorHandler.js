export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err.name === "ValidationError") {
    const errors = {};
    for (const [path, detail] of Object.entries(err.errors)) errors[path] = detail.message;
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for "${err.path}".` });
  }

  // Several models now have unique indexes beyond User.email — name the right one.
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    if (fields.includes("email")) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (fields.includes("job") && fields.includes("applicant")) {
      return res.status(409).json({ message: "You have already applied to this job." });
    }
    if (fields.includes("user") && fields.includes("job")) {
      return res.status(409).json({ message: "You have already saved this job." });
    }
    return res.status(409).json({ message: "This record already exists." });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }

  // multer (resume upload) errors — e.g. a file over the size limit.
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "That file is too large. Resumes must be under 5 MB." });
    }
    return res.status(400).json({ message: "Could not upload that file. Please try again." });
  }

  // A route deliberately set err.status (e.g. upload.js's fileFilter rejecting a non-PDF).
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
}
