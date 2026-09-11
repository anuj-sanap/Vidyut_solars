const { app, connectDatabase } = require("../server");

module.exports = async function handler(req, res) {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error("[vercel-function] Backend initialization failed:", error.message);
    return res.status(503).json({
      success: false,
      message: "Backend initialization failed. Check the server configuration.",
    });
  }
};
