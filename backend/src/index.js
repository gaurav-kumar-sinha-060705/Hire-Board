import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/companies.js";
import jobRoutes from "./routes/jobs.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import notificationRoutes from "./routes/notifications.js";
import statsRoutes from "./routes/stats.js";

dotenv.config();

const secret = process.env.JWT_SECRET || "";
if (!secret || secret === "change-this-to-a-long-random-string" || secret.length < 16) {
  console.error("JWT_SECRET must be set to a strong value (16+ characters).");
  process.exit(1);
}

const frontendUrl = process.env.FRONTEND_URL || "";
if (!frontendUrl) {
  console.error("FRONTEND_URL must be set (e.g. http://localhost:5173).");
  process.exit(1);
}

const app = express();

const allowedOrigins = process.env.FRONTEND_URL.split(",");
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Job portal API running on http://localhost:${PORT}`));
