const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const automatesRoutes = require("./routes/automates.routes");
const variablesRoutes = require("./routes/variables.routes");
const realtimeRoutes = require("./routes/realtime.routes");
const historyRoutes = require("./routes/history.routes");

const { startSchedulers } = require("./services/scheduler.service");

const app = express();
app.use(cors());
app.use(express.json());

// Sert les fichiers du frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Page d’accueil = index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// Routes API
app.use("/api/automates", automatesRoutes);
app.use("/api/variables", variablesRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/history", historyRoutes);

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log("Backend running on port", port);
  await startSchedulers();
});
