// backend/src/server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const automatesRoutes = require("./routes/automates.routes");
const variablesRoutes = require("./routes/variables.routes");
const realtimeRoutes = require("./routes/realtime.routes");
const historyRoutes = require("./routes/history.routes");
const ecritureRoutes = require("./routes/ecriture.routes");

const { startSchedulers } = require("./services/scheduler.service");
const { readRegister } = require("./services/modbus.service");
const variablesController = require("./controllers/variables.controller");

// ===== Création de l'app =====
const app = express();

// ===== Middlewares globaux =====
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// ===== Frontend statique =====
app.use(express.static(path.join(__dirname, "./frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/index.html"));
});

// ===== Routes utilitaires =====

// Healthcheck simple
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend up & running" });
});

// Test Modbus rapide : /api/test-modbus?ip=1.2.3.4&addr=1&type=holding
app.get("/api/test-modbus", async (req, res) => {
  const { ip, addr, type } = req.query;

  if (!ip || !addr || !type) {
    return res.status(400).json({
      error: "Paramètres requis : ip, addr, type (holding|input|coil|discrete)",
    });
  }

  try {
    const value = await readRegister(ip, Number(addr), type);
    res.json({ ip, addr: Number(addr), type, value });
  } catch (err) {
    console.error("[/api/test-modbus] Erreur:", err.message);
    res.status(500).json({ error: "Erreur Modbus : " + err.message });
  }
});

// ===== Routes API métier =====
app.use("/api/automates", automatesRoutes);
app.use("/api/variables", variablesRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/ecriture", ecritureRoutes);

// 🔥 Route d’écriture DIRECTE (même si le router merde)
app.post("/api/variables/:id/write", variablesController.writeValue);

// Message de bienvenue API (optionnel)
app.get("/api", (req, res) => {
  res.json({ message: "Bienvenue sur l'API du système de supervision Modbus." });
});

// Route pour mdp
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: "Missing password" });
  }

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: "Invalid password" });
});

// ===== Gestion 404 API =====
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// ===== Lancement du serveur =====
const port = process.env.PORT || 3001;

app.listen(port, async () => {
  console.log("Backend running on port", port);

  try {
    await startSchedulers();
    console.log("[Scheduler] Démarré");
  } catch (err) {
    console.error("[Scheduler] Erreur au démarrage :", err.message);
  }
});
