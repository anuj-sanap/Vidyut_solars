const fs = require("fs");
const path = require("path");

const guidePath = path.join(__dirname, "..", "docs", "PROJECT_STRUCTURE.md");
const guide = fs.readFileSync(guidePath, "utf8");

console.log(guide);
