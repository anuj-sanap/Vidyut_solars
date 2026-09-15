require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PassThrough } = require("stream");
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");
const { resolvePinCode, calculateSolarEstimate } = require("./scripts/solar-calculator-engine");

const app = express();
const PORT = process.env.PORT || 3000;
const ownerPanelKey = process.env.OWNER_PANEL_KEY || "";
const mongoUri = process.env.MONGODB_URI || "";
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
const adminPassword = process.env.ADMIN_PASSWORD || "";
const uploadsDir = path.join(__dirname, "uploads");
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .concat([
    "https://vidyutsolar.in",
    "https://www.vidyutsolar.in",
    "https://vidyut-solar-electricals.onrender.com",
    "https://vidyut-solar-electricals-1.onrender.com",
    "http://localhost:3000",
    "https://vidyutpowertech.com",
    "https://www.vidyutpowertech.com",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ])
  .filter(Boolean);

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const imageMimeToExtension = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Tokens will reset whenever the server restarts.");
}

const SOLAR_CATALOG = (() => {
  const catalogPath = path.join(__dirname, "data", "solar-plans.json");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const plans = (catalog.plans || []).map((plan) => ({
    ...plan,
    systemSize: Number(plan.systemSize),
    monthlyGeneration: Number(plan.monthlyGeneration || 0),
    roofRequirement: Number(plan.roofRequirement || 0),
    cost: Number(plan.cost || 0),
    monthlySaving: Number(plan.monthlySaving || 0),
    annualSaving: Number(plan.annualSaving || 0),
    panels: plan.panels || "",
    inverter: plan.inverter || "",
    payback: plan.payback || "",
    co2Reduction: plan.co2Reduction || "",
  }));

  return {
    plans,
    assumptions: catalog.assumptions || {},
  };
})();

const FIXED_PLANS = SOLAR_CATALOG.plans;

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
  "anujsanap7@gmail.com",
  "bhushanbagul928@gmail.com",
];
const LEAD_ALERT_EMAILS = VISITOR_ALERT_EMAILS;

const visitCooldownMs = 10 * 60 * 1000;
const recentVisits = new Map();

function validSmtpHost(host) {
  return Boolean(host) && !host.includes("@") && !/^https?:\/\//i.test(host);
}

const hasMailConfig =
  validSmtpHost(String(process.env.SMTP_HOST || "").trim()) &&
  Boolean(String(process.env.SMTP_PORT || "").trim()) &&
  Boolean(String(process.env.SMTP_USER || "").trim()) &&
  Boolean(String(process.env.SMTP_PASS || "").trim());

if (process.env.SMTP_HOST && !validSmtpHost(process.env.SMTP_HOST)) {
  console.warn("SMTP_HOST must be a server host like smtp.gmail.com. Visitor email alerts are disabled.");
}

const transporter = hasMailConfig
  ? nodemailer.createTransport({
      host: String(process.env.SMTP_HOST).trim(),
      port: Number(String(process.env.SMTP_PORT).trim()),
      secure: String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true",
      auth: {
        user: String(process.env.SMTP_USER).trim(),
        pass: String(process.env.SMTP_PASS).trim(),
      },
    })
  : null;

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function createRateLimiter({ windowMs, max, keyGenerator = clientIp }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}

function logServerError(context, error) {
  console.error(`[${context}]`, error);
}

function once(fn) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    fn(...args);
  };
}

function safeSecretEquals(provided, expected) {
  const providedBuffer = Buffer.from(String(provided));
  const expectedBuffer = Buffer.from(String(expected));
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "7d" },
  );
}

function authHeaderToken(req) {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const token = authHeaderToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Please login to continue." });
    }

    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: "Please login to continue." });
    }

    req.user = user;
    return next();
  } catch (_) {
    return res.status(401).json({ success: false, message: "Please login to continue." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access is required." });
  }
  return next();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function midpoint([min, max]) {
  return (min + max) / 2;
}

function valueDistance(value, [min, max]) {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

function findPlanBySystemSize(systemSize) {
  return FIXED_PLANS.find((plan) => Number(plan.systemSize) === Number(systemSize)) || null;
}

function estimateBillToConsumption(bill, assumptions = {}) {
  const tariffPerUnit = Number(assumptions.tariffPerUnit || assumptions.unitRate || 8);
  const billAmount = Number(bill || 0);
  if (!billAmount || billAmount < 0) return 0;
  return Math.round(billAmount / tariffPerUnit);
}

function estimateRequiredCapacityKw(bill, assumptions = {}) {
  const monthlyUnits = estimateBillToConsumption(bill, assumptions);
  const generationPerKw = Number(
    assumptions.monthlyGenerationPerKw ||
      assumptions.generationPerKw ||
      assumptions.generationFactor ||
      120,
  );
  if (!monthlyUnits || !generationPerKw) return 0;
  return Math.max(1, Math.ceil(monthlyUnits / generationPerKw));
}

function buildBestPlan(roofArea, bill, selectedSystemSize = null) {
  const assumptions = SOLAR_CATALOG.assumptions || {};
  const plans = FIXED_PLANS;

  if (selectedSystemSize) {
    const selectedPlan = findPlanBySystemSize(selectedSystemSize);
    if (!selectedPlan) {
      return {
        success: false,
        message: `Selected system size ${selectedSystemSize} kW is not available in the current solar plan catalogue.`,
      };
    }

    if (Number(selectedPlan.roofRequirement) > Number(roofArea)) {
      return {
        success: false,
        code: "ROOF_SPACE_TOO_SMALL",
        message: `The selected ${selectedPlan.systemSize} kW plan requires ${selectedPlan.roofRequirement} sq.ft and exceeds the available roof area of ${roofArea} sq.ft.`,
      };
    }

    return {
      success: true,
      plan: selectedPlan,
      recommended: selectedPlan,
    };
  }

  const consumption = estimateBillToConsumption(bill, assumptions);
  const requiredCapacity = estimateRequiredCapacityKw(bill, assumptions);
  const eligiblePlans = plans.filter((plan) => Number(plan.roofRequirement) <= Number(roofArea));

  if (!eligiblePlans.length) {
    const smallestPlan = plans[0] || null;
    return {
      success: false,
      code: "INSUFFICIENT_ROOF",
      message: `The available roof area of ${roofArea} sq.ft is too small for the smallest supported plan (${smallestPlan ? `${smallestPlan.roofRequirement} sq.ft` : "unknown"}).`,
      requiredCapacity,
      consumption,
      maxRoofSystem: null,
    };
  }

  const sorted = eligiblePlans.slice().sort((a, b) => a.systemSize - b.systemSize);
  const roofMaxPlan = sorted[sorted.length - 1];
  const candidatePlans = sorted.filter((plan) => Number(plan.systemSize) >= Number(requiredCapacity));
  const desiredPlan = candidatePlans[0] || roofMaxPlan;

  return {
    success: true,
    plan: desiredPlan,
    recommended: desiredPlan,
    requiredCapacity,
    consumption,
    maxRoofSystem: roofMaxPlan,
  };
}

function imageExtensionFor(file) {
  return imageMimeToExtension.get(file.mimetype);
}

function imageFileFilter(_, file, cb) {
  if (!imageExtensionFor(file)) {
    return cb(new Error("Only JPG, PNG, and WebP images are allowed."));
  }
  return cb(null, true);
}

function imageHeaderMatches(file, header) {
  if (file.mimetype === "image/jpeg") {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return (
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
    );
  }
  if (file.mimetype === "image/webp") {
    return (
      header.length >= 12 &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function validateAndPipeImage(file, targetStream, cb) {
  const headerChunks = [];
  let headerLength = 0;
  let validated = false;
  let completed = false;

  function finish(error, result) {
    if (completed) return;
    completed = true;
    cb(error, result);
  }

  file.stream.on("data", (chunk) => {
    if (completed) return;

    if (!validated) {
      headerChunks.push(chunk);
      headerLength += chunk.length;

      if (headerLength < 12) return;

      const header = Buffer.concat(headerChunks, headerLength);
      if (!imageHeaderMatches(file, header)) {
        targetStream.destroy();
        file.stream.resume();
        finish(new Error("Uploaded file content does not match an allowed image type."));
        return;
      }

      validated = true;
      headerChunks.forEach((headerChunk) => targetStream.write(headerChunk));
      headerChunks.length = 0;
      return;
    }

    targetStream.write(chunk);
  });

  file.stream.on("end", () => {
    if (completed) return;
    if (!validated) {
      const header = Buffer.concat(headerChunks, headerLength);
      if (!imageHeaderMatches(file, header)) {
        targetStream.destroy();
        finish(new Error("Uploaded file content does not match an allowed image type."));
        return;
      }
      headerChunks.forEach((headerChunk) => targetStream.write(headerChunk));
    }
    targetStream.end();
  });

  file.stream.on("error", (error) => {
    targetStream.destroy();
    finish(error);
  });
}

function cloudinaryMulterStorage() {
  return {
    _handleFile(_, file, cb) {
      const done = once(cb);
      const extension = imageExtensionFor(file);
      if (!extension) return done(new Error("Only JPG, PNG, and WebP images are allowed."));

      const publicId = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "vidyut-solar",
          resource_type: "image",
          public_id: publicId,
          format: extension,
        },
        (error, result) => {
          if (error) return done(error);
          return done(null, {
            filename: result.public_id,
            path: result.secure_url,
            size: result.bytes,
            mimetype: file.mimetype,
          });
        },
      );

      uploadStream.on("error", done);
      return validateAndPipeImage(file, uploadStream, done);
    },
    _removeFile(_, file, cb) {
      if (!file.filename) return cb(null);
      cloudinary.uploader.destroy(file.filename).finally(() => cb(null));
    },
  };
}

function localImageStorage() {
  return {
    _handleFile(_, file, cb) {
      const done = once(cb);
      const extension = imageExtensionFor(file);
      if (!extension) return done(new Error("Only JPG, PNG, and WebP images are allowed."));

      const filename = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${extension}`;
      const fullPath = path.join(uploadsDir, filename);
      const output = fs.createWriteStream(fullPath);
      let size = 0;

      const sizeCounter = new PassThrough();
      sizeCounter.on("data", (chunk) => {
        size += chunk.length;
      });
      sizeCounter.pipe(output);

      output.on("error", done);
      output.on("finish", () => {
        done(null, {
          destination: uploadsDir,
          filename,
          path: fullPath,
          size,
          mimetype: file.mimetype,
        });
      });

      return validateAndPipeImage(file, sizeCounter, (error) => {
        if (!error) return;
        output.destroy();
        fs.unlink(fullPath, () => done(error));
      });
    },
    _removeFile(_, file, cb) {
      if (!file.path) return cb(null);
      fs.unlink(file.path, cb);
    },
  };
}

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

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
    quote: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
);

const Lead = mongoose.model("Lead", leadSchema);
const Project = mongoose.model("Project", projectSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);
const User = mongoose.model("User", userSchema);

function cleanupOldVisits() {
  const now = Date.now();
  recentVisits.forEach((ts, key) => {
    if (now - ts > visitCooldownMs) recentVisits.delete(key);
  });
}

async function sendVisitorEmail({ page, ip, userAgent, visitId }) {
  if (!transporter) return { sent: false, reason: "email-not-configured" };

  const subject = "New visitor on Vidyut PowerTech website";
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

async function sendLeadEmail({ lead, ip, userAgent }) {
  if (!transporter) return { sent: false, reason: "email-not-configured" };

  const subject = `New solar quote request from ${lead.name}`;
  const text = [
    "A new quote request was submitted on the Vidyut PowerTech website.",
    "",
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Location: ${lead.location}`,
    `Plot Size: ${lead.plotSize} sq ft`,
    `Monthly Electricity Bill: ${lead.electricityBill || "Not provided"}`,
    `Source: ${lead.source || "website-form"}`,
    `Submitted At: ${new Date().toLocaleString("en-IN")}`,
    `IP: ${ip || "N/A"}`,
    `Browser: ${userAgent || "N/A"}`,
  ].join("\n");

  await transporter.sendMail({
    from: process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER,
    to: LEAD_ALERT_EMAILS.join(", "),
    subject,
    text,
  });

  return { sent: true };
}

function createUploader() {
  if (hasCloudinaryConfig) {
    return multer({
      storage: cloudinaryMulterStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 25 * 1024 * 1024 },
    });
  }

  return multer({
    storage: localImageStorage(),
    fileFilter: imageFileFilter,
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

function feedbackToResponse(feedbackDoc) {
  return {
    id: feedbackDoc._id.toString(),
    createdAt: feedbackDoc.createdAt,
    updatedAt: feedbackDoc.updatedAt,
    name: feedbackDoc.name,
    location: feedbackDoc.location || "",
    quote: feedbackDoc.quote || "",
  };
}

const upload = createUploader();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const adminRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const leadRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 12 });
const visitRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || !uniqueAllowedOrigins.length || uniqueAllowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json({ limit: "25kb" }));
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

const rootCarouselImages = ["img1.jpeg", "img2.jpeg", "img3.jpeg"];
app.get("/media/:fileName", (req, res, next) => {
  const fileName = String(req.params.fileName || "");
  if (!rootCarouselImages.includes(fileName)) return next();
  const filePath = path.join(__dirname, "public", "assets", "images", "hero", fileName);
  return res.sendFile(filePath, (error) => {
    if (error) {
      return res.status(error.statusCode || 404).end();
    }
    return undefined;
  });
});

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const exists = await User.exists({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: "user" });
    return res.status(201).json({
      success: true,
      user: publicUser(user),
      token: signAuthToken(user),
    });
  } catch (error) {
    logServerError("register-user", error);
    return res.status(500).json({ success: false, message: "Unable to create account right now." });
  }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const passwordHash = await bcrypt.hash(password, 12);
      const adminUser = await User.findOneAndUpdate(
        { email },
        { $set: { name: "Admin", email, passwordHash, role: "admin" } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return res.json({
        success: true,
        user: publicUser(adminUser),
        token: signAuthToken(adminUser),
      });
    }

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    return res.json({
      success: true,
      user: publicUser(user),
      token: signAuthToken(user),
    });
  } catch (error) {
    logServerError("login-user", error);
    return res.status(500).json({ success: false, message: "Unable to login right now." });
  }
});

app.post("/api/auth/admin/login", authRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const ownerKey = String(req.body?.ownerKey || "");

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.findOneAndUpdate(
        { email },
        { $set: { name: "Admin", email, passwordHash, role: "admin" } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return res.json({ success: true, user: publicUser(user), token: signAuthToken(user) });
    }

    const ownerKeyMatches = ownerPanelKey && safeSecretEquals(ownerKey, ownerPanelKey);
    if (ownerKeyMatches && email && password.length >= 8) {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.findOneAndUpdate(
        { email },
        { $set: { name: "Admin", email, passwordHash, role: "admin" } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return res.json({ success: true, user: publicUser(user), token: signAuthToken(user) });
    }

    const user = await User.findOne({ email, role: "admin" });
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    return res.json({ success: true, user: publicUser(user), token: signAuthToken(user) });
  } catch (error) {
    logServerError("login-admin", error);
    return res.status(500).json({ success: false, message: "Unable to login right now." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  return res.json({ success: true, user: publicUser(req.user) });
});

// ----------------------------------------------------------------------------
// Solar Calculator API Endpoints
// ----------------------------------------------------------------------------

app.get("/api/calculator/pincode", async (req, res) => {
  try {
    const pinCode = String(req.query?.code || "").trim();
    if (!pinCode || pinCode.length !== 6 || !/^\d{6}$/.test(pinCode)) {
      return res.status(400).json({ success: false, message: "Enter a valid 6-digit PIN code." });
    }
    const resolved = await resolvePinCode(pinCode);
    if (!resolved) {
      return res.status(404).json({ success: false, message: "PIN code solar data not found." });
    }
    return res.json({ success: true, location: resolved });
  } catch (error) {
    return res.status(500).json({ success: false, message: "PIN lookup failed." });
  }
});

app.post("/api/calculator", async (req, res) => {
  try {
    const input = {
      pinCode: String(req.body?.pinCode || "").trim(),
      customerType: req.body?.customerType || 'residential',
      billMode: req.body?.billMode || (req.body?.monthlyUnits ? 'units' : 'bill'),
      monthlyBill: Number(req.body?.monthlyBill ?? req.body?.bill ?? 0),
      monthlyUnits: Number(req.body?.monthlyUnits ?? req.body?.units ?? 0),
      roofArea: Number(req.body?.roofArea ?? req.body?.availableRoofArea ?? req.body?.plotSize ?? 0),
      roofAreaUnknown: Boolean(req.body?.roofAreaUnknown),
      systemSize: req.body?.systemSize || req.body?.selectedSystemSize || "",
      loanTenureMonths: Number(req.body?.loanTenureMonths || 36),
    };

    const output = await calculateSolarEstimate(input);

    const selectedPlan = {
      systemSize: output.solar.recommendedKw,
      cost: output.financial.grossCost,
      monthlySaving: output.financial.monthlySavings,
      annualSaving: output.financial.annualSavings,
      roofRequirement: output.solar.estimatedRoofAreaSqft,
      panels: `${output.solar.panelCount} × ${output.solar.panelWattage}W`,
      inverter: `${output.solar.recommendedKw} kW Grid Inverter`,
      payback: `${output.financial.paybackYears} years`,
      co2Reduction: `${output.environmental.co2AvoidedTonnesAnnual} tonnes/year`,
    };

    return res.json({
      success: true,
      data: output,
      result: {
        availableRoofArea: input.roofArea || output.solar.estimatedRoofAreaSqft,
        monthlyBill: input.monthlyBill || 0,
        estimatedConsumption: output.electricity.monthlyUnitsEstimated,
        requiredCapacity: output.solar.requiredKwRaw,
        capacityDemand: output.solar.requiredKwRaw,
        selectedSystemSize: output.solar.recommendedKw,
        maxRoofSystem: output.solar.recommendedKw,
        maxRoofArea: output.solar.estimatedRoofAreaSqft,
        bestPlan: output.solar.recommendedKw,
        roofFits: output.solar.roofAreaSufficient !== false,
        plan: selectedPlan,
        plans: [selectedPlan],
        ...selectedPlan,
      },
    });
  } catch (err) {
    const message = err && err.message ? err.message : 'Calculation error';
    return res.status(400).json({ success: false, message });
  }
});

app.post("/api/calculator/lead", leadRateLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const email = String(req.body?.email || "").trim();
    const pinCode = String(req.body?.pinCode || "").trim();
    const contactMethod = String(req.body?.preferredContactMethod || "whatsapp").trim();
    const calculation = req.body?.calculation || {};

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: "Full Name is required." });
    }
    if (!phone || !/^[0-9+ ]{10,15}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Valid 10-digit phone number is required." });
    }

    const leadData = {
      name,
      phone,
      email: email || undefined,
      location: calculation?.location?.city ? `${calculation.location.city}, ${calculation.location.state} (${pinCode})` : pinCode || "Nashik",
      plotSize: String(calculation?.solar?.estimatedRoofAreaSqft || req.body?.roofArea || "Standard"),
      electricityBill: String(calculation?.financial?.monthlySavings || req.body?.monthlyBill || "Not specified"),
      source: "solar-calculator-quote-modal",
      preferredContactMethod: contactMethod,
      recommendedKw: calculation?.solar?.recommendedKw,
      netInvestment: calculation?.financial?.netInvestment,
      annualSavings: calculation?.financial?.annualSavings,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    if (Lead) {
      const dbLead = new Lead(leadData);
      await dbLead.save();
    } else {
      const fileLeads = readLeadsFromFile();
      fileLeads.unshift({ id: String(Date.now()), ...leadData });
      writeLeadsToFile(fileLeads);
    }

    sendLeadEmail({ lead: leadData, ip: clientIp(req), userAgent: req.headers["user-agent"] || "" }).catch(() => {});
    return res.json({ success: true, message: "Quote request submitted successfully." });
  } catch (error) {
    logServerError("calculator-lead", error);
    return res.status(500).json({ success: false, message: "Unable to submit quote request right now." });
  }
});

app.post("/api/notify-visit", visitRateLimit, async (req, res) => {
  try {
    const page = String(req.body?.page || "/");
    const visitId = String(req.body?.visitId || "anonymous");
    const userAgent = req.headers["user-agent"] || "";
    const ip = clientIp(req);
    const dedupeKey = `${visitId}-${page}`;

    cleanupOldVisits();
    if (recentVisits.has(dedupeKey)) {
      return res.json({ success: true, skipped: true, reason: "cooldown-active" });
    }
    recentVisits.set(dedupeKey, Date.now());

    try {
      const result = await sendVisitorEmail({ page, ip, userAgent, visitId });
      return res.json({ success: result.sent === true, ...result });
    } catch (emailError) {
      logServerError("notify-visit-email", emailError);
      return res.json({
        success: true,
        sent: false,
        reason: "email-send-failed",
      });
    }
  } catch (error) {
    logServerError("notify-visit", error);
    return res.status(500).json({
      success: false,
      message: "Visitor notification failed.",
    });
  }
});

app.post("/api/leads", leadRateLimit, upload.array("siteImages", 6), async (req, res) => {
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

    const lead = await Lead.create({
      name: name.trim(),
      phone: cleanPhone,
      location: location.trim(),
      plotSize: plotSize.trim(),
      electricityBill: electricityBill.trim(),
      source,
      files,
    });

    try {
      await sendLeadEmail({
        lead,
        ip: clientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });
    } catch (emailError) {
      logServerError("lead-email", emailError);
    }

    return res.json({
      success: true,
      message: "Thank you! Your request has been submitted successfully.",
    });
  } catch (error) {
    logServerError("create-lead", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
});

app.get("/api/projects", async (_, res) => {
  try {
    const projects = await Project.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, projects: projects.map(projectToResponse) });
  } catch (error) {
    logServerError("list-projects", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch projects.",
    });
  }
});

app.get("/api/feedback", async (_, res) => {
  try {
    const feedbackItems = await Feedback.find({}).sort({ createdAt: -1 });
    return res.json({
      success: true,
      feedback: feedbackItems.map(feedbackToResponse),
    });
  } catch (error) {
    logServerError("list-feedback", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer feedback.",
    });
  }
});

app.post("/api/admin/feedback", adminRateLimit, requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const location = String(req.body?.location || "").trim();
    const quote = String(req.body?.quote || "").trim();

    if (!name || !quote) {
      return res.status(400).json({
        success: false,
        message: "Customer name and feedback message are required.",
      });
    }

    const feedback = await Feedback.create({ name, location, quote });
    return res.status(201).json({
      success: true,
      feedback: feedbackToResponse(feedback),
      message: "Customer feedback added successfully.",
    });
  } catch (error) {
    logServerError("create-feedback", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save customer feedback.",
    });
  }
});

app.put("/api/admin/feedback/:id", adminRateLimit, requireAuth, requireAdmin, async (req, res) => {
  try {
    const feedbackId = req.params.id;
    if (!mongoose.isValidObjectId(feedbackId)) {
      return res.status(400).json({ success: false, message: "Invalid feedback id." });
    }

    const name = String(req.body?.name || "").trim();
    const location = String(req.body?.location || "").trim();
    const quote = String(req.body?.quote || "").trim();

    if (!name || !quote) {
      return res.status(400).json({
        success: false,
        message: "Customer name and feedback message are required.",
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { name, location, quote },
      { new: true, runValidators: true },
    );

    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found." });
    }

    return res.json({
      success: true,
      feedback: feedbackToResponse(feedback),
      message: "Customer feedback updated.",
    });
  } catch (error) {
    logServerError("update-feedback", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update customer feedback.",
    });
  }
});

app.delete("/api/admin/feedback/:id", adminRateLimit, requireAuth, requireAdmin, async (req, res) => {
  try {
    const feedbackId = req.params.id;
    if (!mongoose.isValidObjectId(feedbackId)) {
      return res.status(400).json({ success: false, message: "Invalid feedback id." });
    }

    const feedback = await Feedback.findByIdAndDelete(feedbackId);
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found." });
    }

    return res.json({
      success: true,
      message: "Customer feedback removed.",
    });
  } catch (error) {
    logServerError("delete-feedback", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete customer feedback.",
    });
  }
});

app.post("/api/admin/projects", adminRateLimit, requireAuth, requireAdmin, upload.array("projectImages", 12), async (req, res) => {
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
    logServerError("create-project", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save project.",
    });
  }
});

app.put("/api/admin/projects/:id", adminRateLimit, requireAuth, requireAdmin, upload.array("projectImages", 12), async (req, res) => {
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
    logServerError("update-project", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update project.",
    });
  }
});

app.delete("/api/admin/projects/:id", adminRateLimit, requireAuth, requireAdmin, async (req, res) => {
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
    logServerError("delete-project", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete project.",
    });
  }
});

app.use((error, _, res, next) => {
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({
      success: false,
      message: "This website origin is not allowed to use the API.",
    });
  }
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image is too large. Maximum allowed size is 25MB per file.",
      });
    }
    return res.status(400).json({
      success: false,
      message: "Upload failed. Please check the selected images and try again.",
    });
  }
  if (error.message === "Only JPG, PNG, and WebP images are allowed.") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  if (error.message === "Uploaded file content does not match an allowed image type.") {
    return res.status(400).json({
      success: false,
      message: "Uploaded file content does not match an allowed image type.",
    });
  }
  logServerError("request-error", error);
  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
});

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    service: "Vidyut PowerTech lead system",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uploads: hasCloudinaryConfig ? "cloudinary" : "local",
  });
});

let databaseConnectionPromise;

async function connectDatabase() {
  if (!mongoUri) {
    console.warn("MONGODB_URI is not set. Starting with database features disabled.");
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  if (!databaseConnectionPromise) {
    databaseConnectionPromise = mongoose.connect(mongoUri).catch((error) => {
      databaseConnectionPromise = undefined;
      throw error;
    });
  }

  await databaseConnectionPromise;
}

module.exports = { app, connectDatabase };

if (require.main === module) {
  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(
          mongoUri
            ? "Database connected."
            : "Database disconnected; configure MONGODB_URI to enable persistence.",
        );
        console.log(
          hasCloudinaryConfig
            ? "Upload storage: Cloudinary"
            : "Upload storage: local uploads folder (Cloudinary env vars not set)",
        );
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error.message);
      process.exitCode = 1;
    });
}
