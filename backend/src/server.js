// backend/src/server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const automatesRoutes = require("./routes/automates.routes");
const variablesRoutes = require("./routes/variables.routes");
const realtimeRoutes = require("./routes/realtime.routes");
const historyRoutes = require("./routes/history.routes");

const { startSchedulers } = require("./services/scheduler.service");
const { readRegister } = require("./services/modbus.service");

const app = express();

// ===== Middlewares globaux =====
app.use(cors());              // Autorise toutes les origines (pratique en dev)
app.use(express.json());      // Pour lire le JSON dans le body

// Petit log minimal des requêtes (optionnel mais utile)
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// ===== Frontend statique =====
// Sert les fichiers du frontend (HTML, CSS, JS...) depuis le dossier /frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Page d’accueil = index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
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
      error: "Paramètres requis : ip, addr, type (holding|input|coil|discrete)"
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
app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l'API du système de supervision Modbus." });
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
