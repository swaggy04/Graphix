import express from "express";
import analyticRoutes from "./routes/analytic-routes";

const app = express();

const PORT = 3001;

// Parse JSON request bodies.
app.use(express.json());

// API routes.
app.use("/api", analyticRoutes);

// Health check.
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.listen(PORT, () => {
  console.log(`Grapix backend running on http://localhost:${PORT}`);
});
//https://github.com/swaggy04/gitty.git