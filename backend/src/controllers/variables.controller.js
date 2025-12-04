// backend/src/controllers/variables.controller.js

const { query } = require("../db");
const { restartSchedulers } = require("../services/scheduler.service");

// Toute la logique Modbus est centralisée dans le service
const {
  readRegister,   // utilise FC1/2/3/4 selon register_type
  writeCoil,      // FC5  - Force Single Coil
  writeRegister,  // FC6  - Preset Single Register
} = require("../services/modbus.service");

// -----------------------------------------------------------------------------
// Récupérer toutes les variables avec infos automate
// -----------------------------------------------------------------------------
exports.getAll = async (req, res) => {
  const rows = await query(`
    SELECT 
      v.id,
      v.automate_id,
      v.name,
      v.register_address,
      v.register_type,
      v.frequency_sec,
      v.unit,
      v.created_at,
      a.name AS automate_name,
      a.ip_address
    FROM variables v
    JOIN automates a ON a.id = v.automate_id
    ORDER BY v.id DESC
  `);

  res.json(rows);
};

// -----------------------------------------------------------------------------
// Récupérer une variable par id
// -----------------------------------------------------------------------------
exports.getOne = async (req, res) => {
  const { id } = req.params;

  const rows = await query("SELECT * FROM variables WHERE id = ?", [id]);

  if (!rows[0]) {
    return res.status(404).json({ error: "Variable not found" });
  }

  res.json(rows[0]);
};

// -----------------------------------------------------------------------------
// Créer une nouvelle variable
// -----------------------------------------------------------------------------
exports.create = async (req, res) => {
  const {
    automate_id,
    name,
    register_address,
    register_type,
    frequency_sec,
    unit,
  } = req.body;

  if (!automate_id || !name || register_address == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const freq = frequency_sec ? Number(frequency_sec) : 5;

  const r = await query(
    `
    INSERT INTO variables
      (automate_id, name, register_address, register_type, frequency_sec, unit)
    VALUES (?,?,?,?,?,?)
  `,
    [
      automate_id,
      name,
      register_address,
      register_type || "holding",
      freq,
      unit || null,
    ]
  );

  const newId = Number(r.insertId);

  await restartSchedulers();
  res.status(201).json({ id: newId });
};

// -----------------------------------------------------------------------------
// Mettre à jour une variable existante
// -----------------------------------------------------------------------------
exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    automate_id,
    name,
    register_address,
    register_type,
    frequency_sec,
    unit,
  } = req.body;

  if (!automate_id || !name || register_address == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const freq = frequency_sec ? Number(frequency_sec) : 5;

  await query(
    `
    UPDATE variables
    SET 
      automate_id = ?,
      name = ?,
      register_address = ?,
      register_type = ?,
      frequency_sec = ?,
      unit = ?
    WHERE id = ?
  `,
    [
      automate_id,
      name,
      register_address,
      register_type || "holding",
      freq,
      unit || null,
      id,
    ]
  );

  await restartSchedulers();
  res.json({ ok: true });
};

// -----------------------------------------------------------------------------
// Supprimer une variable
// -----------------------------------------------------------------------------
exports.remove = async (req, res) => {
  const { id } = req.params;

  await query("DELETE FROM variables WHERE id = ?", [id]);
  await restartSchedulers();
  res.json({ ok: true });
};

// -----------------------------------------------------------------------------
// Écrire une valeur dans l’automate lié à la variable
// → utilise FC5 (writeCoil) ou FC6 (writeRegister) via modbus.service
// -----------------------------------------------------------------------------
exports.writeValue = async (req, res) => {
  const { id } = req.params;
  let { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ error: "Aucune valeur envoyée" });
  }

  value = Number(value);
  if (Number.isNaN(value)) {
    return res.status(400).json({ error: "La valeur doit être un nombre" });
  }

  try {
    // 1) Variable + IP de l'automate
    const rows = await query(
      `
      SELECT v.id, v.register_address, v.register_type, a.ip_address
      FROM variables v
      JOIN automates a ON v.automate_id = a.id
      WHERE v.id = ?
    `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Variable introuvable" });
    }

    const v = rows[0];
    const addr = Number(v.register_address);

    // 2) Écriture via le service Modbus (FC5 / FC6)
    let writeOk = false;

    if (v.register_type === "holding") {
      // FC6 - Preset Single Register
      writeOk = await writeRegister(v.ip_address, addr, value);
    } else if (v.register_type === "coil") {
      // FC5 - Force Single Coil
      writeOk = await writeCoil(v.ip_address, addr, value ? 1 : 0);
    } else {
      return res.status(400).json({
        error:
          "Type de registre non supporté pour l'écriture (seulement holding / coil)",
      });
    }

    // 3) Lecture immédiate (readback) via FC1/3 (selon type)
    let readback = null;
    try {
      readback = await readRegister(
        v.ip_address,
        addr,
        v.register_type === "coil" ? "coil" : "holding"
      );
    } catch (e) {
      console.warn("[writeValue] readback impossible:", e.message);
    }

    return res.json({
      success: writeOk,
      written: value,
      readback,
      debug: {
        ip: v.ip_address,
        addr,
        type: v.register_type,
      },
    });
  } catch (err) {
    console.error("[Variables] Erreur writeValue:", err);
    return res.status(500).json({ error: "Erreur Modbus / serveur" });
  }
};
