require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, default: "" },
    imagePaths: [{ type: String, required: true }],
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true },
);

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
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true },
);

const Project = mongoose.model("Project", projectSchema);
const Lead = mongoose.model("Lead", leadSchema);

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function migrateProjects() {
  const projectsFile = path.join(__dirname, "..", "data", "projects.json");
  const rows = readJsonArray(projectsFile);
  let inserted = 0;

  for (const row of rows) {
    const title = String(row.title || "").trim();
    const location = String(row.location || "").trim();
    const imagePaths = Array.isArray(row.imagePaths)
      ? row.imagePaths.filter((v) => typeof v === "string")
      : row.imagePath
        ? [String(row.imagePath)]
        : [];

    if (!title || !location || !imagePaths.length) continue;

    const exists = await Project.findOne({
      title,
      location,
      createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
    });
    if (exists) continue;

    await Project.create({
      title,
      location,
      description: String(row.description || "").trim(),
      imagePaths,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
    });
    inserted += 1;
  }
  return { total: rows.length, inserted };
}

async function migrateLeads() {
  const leadsFile = path.join(__dirname, "..", "data", "leads.json");
  const rows = readJsonArray(leadsFile);
  let inserted = 0;

  for (const row of rows) {
    const name = String(row.name || "").trim();
    const phone = String(row.phone || "").replace(/\D/g, "");
    const location = String(row.location || "").trim();
    const plotSize = String(row.plotSize || "").trim();
    if (!name || !phone || !location || !plotSize) continue;

    const exists = await Lead.findOne({
      name,
      phone,
      location,
      createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
    });
    if (exists) continue;

    const files = Array.isArray(row.files)
      ? row.files.map((f) => ({
          originalName: String(f.originalName || ""),
          fileName: String(f.fileName || ""),
          filePath: String(f.filePath || ""),
          size: Number(f.size || 0),
          mimeType: String(f.mimeType || ""),
        }))
      : [];

    await Lead.create({
      name,
      phone,
      location,
      plotSize,
      electricityBill: String(row.electricityBill || "").trim(),
      source: String(row.source || "website-form").trim(),
      files,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
    });
    inserted += 1;
  }
  return { total: rows.length, inserted };
}

async function main() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required in .env");
  }
  await mongoose.connect(mongoUri);

  const projectStats = await migrateProjects();
  const leadStats = await migrateLeads();

  console.log("Migration complete.");
  console.log(`Projects: ${projectStats.inserted}/${projectStats.total} inserted`);
  console.log(`Leads: ${leadStats.inserted}/${leadStats.total} inserted`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Migration failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
