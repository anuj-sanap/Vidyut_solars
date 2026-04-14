require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
const PORT = process.env.PORT || 3000;
const ownerPanelKey = process.env.OWNER_PANEL_KEY || "";
const mongoUri = process.env.MONGODB_URI || "";
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const hasCloudinaryConfig =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const VISITOR_ALERT_EMAILS = [
  "sanapanuj7@gmail.com",
  "vidyutsolarelectricals@gmail.com",
];

const visitCooldownMs = 10 * 60 * 1000;
const recentVisits = new Map();

const hasMailConfig =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_PORT) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);

const transporter = hasMailConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    plotSize: { type: String, required: true },
    electricityBill: { type: String, default: "" },
    source: { type: String, default: "website-form" },
    files: [
      {
        originalName: { type: String, default: "" },
        fileName: { type: String, default: "" },
        filePath: { type: String, default: "" },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, default: "" },
    imagePaths: [{ type: String, required: true }],
  },
  { timestamps: true },
);

const Lead = mongoose.model("Lead", leadSchema);
const Project = mongoose.model("Project", projectSchema);

function cleanupOldVisits() {
  const now = Date.now();
  recentVisits.forEach((ts, key) => {
    if (now - ts > visitCooldownMs) recentVisits.delete(key);
  });
}

async function sendVisitorEmail({ page, ip, userAgent, visitId }) {
  if (!transporter) return { sent: false, reason: "email-not-configured" };

  const subject = "New visitor on Vidyut Solar website";
  const text = [
    "A new visitor has opened the website.",
    "",
    `Time: ${new Date().toLocaleString("en-IN")}`,
    `Page: ${page || "/"}`,
    `Visit ID: ${visitId || "N/A"}`,
    `IP: ${ip || "N/A"}`,
    `Browser: ${userAgent || "N/A"}`,
  ].join("\n");

  await transporter.sendMail({
    from: process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER,
    to: VISITOR_ALERT_EMAILS.join(", "),
    subject,
    text,
  });
  return { sent: true };
}

function createUploader() {
  if (hasCloudinaryConfig) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: async (_, file) => {
        const ext = file.originalname.split(".").pop() || "jpg";
        return {
          folder: "vidyut-solar",
          resource_type: "image",
          public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
          format: ext.toLowerCase(),
        };
      },
    });
    return multer({
      storage,
      limits: { fileSize: 25 * 1024 * 1024 },
    });
  }

  const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadsDir),
    filename: (_, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
      cb(null, safeName);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
  });
}

function normalizeUploadedFile(file) {
  const isCloudUrl = typeof file.path === "string" && /^https?:\/\//.test(file.path);
  return {
    originalName: file.originalname || "",
    fileName: file.filename || "",
    filePath: isCloudUrl ? file.path : `/uploads/${file.filename}`,
    size: Number(file.size || 0),
    mimeType: file.mimetype || "",
  };
}

function projectToResponse(projectDoc) {
  return {
    id: projectDoc._id.toString(),
    createdAt: projectDoc.createdAt,
    updatedAt: projectDoc.updatedAt,
    title: projectDoc.title,
    location: projectDoc.location,
    description: projectDoc.description || "",
    imagePaths: Array.isArray(projectDoc.imagePaths) ? projectDoc.imagePaths : [],
  };
}

const upload = createUploader();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

const rootCarouselImages = ["img1.jpeg", "img2.jpeg", "img3.jpeg"];
app.get("/media/:fileName", (req, res, next) => {
  const fileName = String(req.params.fileName || "");
  if (!rootCarouselImages.includes(fileName)) return next();
  const filePath = path.join(__dirname, fileName);
  return res.sendFile(filePath, (error) => {
    if (error) {
      return res.status(error.statusCode || 404).end();
    }
    return undefined;
  });
});

app.post("/api/notify-visit", async (req, res) => {
  try {
    const page = String(req.body?.page || "/");
    const visitId = String(req.body?.visitId || "anonymous");
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const dedupeKey = `${visitId}-${page}`;

    cleanupOldVisits();
    if (recentVisits.has(dedupeKey)) {
      return res.json({ success: true, skipped: true, reason: "cooldown-active" });
    }
    recentVisits.set(dedupeKey, Date.now());

    const result = await sendVisitorEmail({ page, ip, userAgent, visitId });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Visitor notification failed.",
      error: error.message,
    });
  }
});

app.post("/api/leads", upload.array("siteImages", 6), async (req, res) => {
  try {
    const {
      name = "",
      phone = "",
      location = "",
      plotSize = "",
      electricityBill = "",
      source = "website-form",
    } = req.body;

    const cleanPhone = String(phone).replace(/\D/g, "");

    if (!name.trim() || !cleanPhone.trim() || !location.trim() || !plotSize.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, location, and plot size are required.",
      });
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit phone number.",
      });
    }

    const files = (req.files || []).map(normalizeUploadedFile);

    await Lead.create({
      name: name.trim(),
      phone: cleanPhone,
      location: location.trim(),
      plotSize: plotSize.trim(),
      electricityBill: electricityBill.trim(),
      source,
      files,
    });

    return res.json({
      success: true,
      message: "Thank you! Your request has been submitted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
      error: error.message,
    });
  }
});

function requireOwner(req, res, next) {
  if (!ownerPanelKey) {
    return res.status(503).json({
      success: false,
      message: "Owner panel is not configured. Set OWNER_PANEL_KEY in environment.",
    });
  }

  const providedKey = req.header("x-owner-key") || "";
  if (providedKey !== ownerPanelKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized owner access.",
    });
  }
  return next();
}

app.get("/api/projects", async (_, res) => {
  try {
    const projects = await Project.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, projects: projects.map(projectToResponse) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch projects.",
      error: error.message,
    });
  }
});

app.post("/api/admin/projects", requireOwner, upload.array("projectImages", 12), async (req, res) => {
  try {
    const { title = "", location = "", description = "" } = req.body;
    if (!title.trim() || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project title and location are required.",
      });
    }
    const projectFiles = req.files || [];
    if (!projectFiles.length) {
      return res.status(400).json({
        success: false,
        message: "At least one project image is required.",
      });
    }

    const newProject = await Project.create({
      title: title.trim(),
      location: location.trim(),
      description: description.trim(),
      imagePaths: projectFiles.map((file) => normalizeUploadedFile(file).filePath),
    });

    return res.json({
      success: true,
      message: "Project added successfully.",
      project: projectToResponse(newProject),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to save project.",
      error: error.message,
    });
  }
});

app.put("/api/admin/projects/:id", requireOwner, upload.array("projectImages", 12), async (req, res) => {
  try {
    const projectId = String(req.params.id || "");
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project id." });
    }

    const { title = "", location = "", description = "", keepImagePaths = "[]" } = req.body;
    if (!title.trim() || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project title and location are required.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    let keptImages = [];
    try {
      const parsed = JSON.parse(keepImagePaths);
      keptImages = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch (_) {
      keptImages = [];
    }

    const newUploads = (req.files || []).map((file) => normalizeUploadedFile(file).filePath);
    const mergedImages = [...keptImages, ...newUploads];
    if (!mergedImages.length) {
      return res.status(400).json({ success: false, message: "At least one image is required." });
    }

    project.title = title.trim();
    project.location = location.trim();
    project.description = description.trim();
    project.imagePaths = mergedImages;
    await project.save();

    return res.json({
      success: true,
      message: "Project updated successfully.",
      project: projectToResponse(project),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update project.",
      error: error.message,
    });
  }
});

app.delete("/api/admin/projects/:id", requireOwner, async (req, res) => {
  try {
    const projectId = String(req.params.id || "");
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project id." });
    }

    const deleted = await Project.findByIdAndDelete(projectId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    return res.json({ success: true, message: "Project deleted successfully." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to delete project.",
      error: error.message,
    });
  }
});

app.use((error, _, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image is too large. Maximum allowed size is 25MB per file.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }
  return next(error);
});

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    service: "Vidyut Solar lead system",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uploads: hasCloudinaryConfig ? "cloudinary" : "local",
  });
});

async function startServer() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required. Add it to your .env file.");
  }
  await mongoose.connect(mongoUri);
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Database connected.`);
    if (hasCloudinaryConfig) {
      console.log("Upload storage: Cloudinary");
    } else {
      console.log("Upload storage: local uploads folder (Cloudinary env vars not set)");
    }
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
