const { query } = require("../db");
const { restartSchedulers } = require("../services/scheduler.service");

// Récupérer toutes les variables avec infos automate
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

// Récupérer une variable par id
exports.getOne = async (req, res) => {
  const { id } = req.params;

  const rows = await query(
    "SELECT * FROM variables WHERE id = ?",
    [id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "Variable not found" });
  }

  res.json(rows[0]);
};

// Créer une nouvelle variable
exports.create = async (req, res) => {
  const {
    automate_id,
    name,
    register_address,
    register_type,
    frequency_sec,
    unit
  } = req.body;

  if (!automate_id || !name || register_address == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const freq = frequency_sec ? Number(frequency_sec) : 5;

  const r = await query(`
    INSERT INTO variables
      (automate_id, name, register_address, register_type, frequency_sec, unit)
    VALUES (?,?,?,?,?,?)
  `, [
    automate_id,
    name,
    register_address,
    register_type || "holding",
    freq,
    unit || null
  ]);

  // insertId peut être un BigInt → on le convertit
  const newId = Number(r.insertId);

  await restartSchedulers();
  res.status(201).json({ id: newId });
};

// Mettre à jour une variable existante
exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    automate_id,
    name,
    register_address,
    register_type,
    frequency_sec,
    unit
  } = req.body;

  if (!automate_id || !name || register_address == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const freq = frequency_sec ? Number(frequency_sec) : 5;

  await query(`
    UPDATE variables
    SET 
      automate_id = ?,
      name = ?,
      register_address = ?,
      register_type = ?,
      frequency_sec = ?,
      unit = ?
    WHERE id = ?
  `, [
    automate_id,
    name,
    register_address,
    register_type || "holding",
    freq,
    unit || null,
    id
  ]);

  await restartSchedulers();
  res.json({ ok: true });
};

// Supprimer une variable
exports.remove = async (req, res) => {
  const { id } = req.params;

  await query("DELETE FROM variables WHERE id = ?", [id]);
  await restartSchedulers();
  res.json({ ok: true });
};
exports.writeValue = async (req, res) => {
  const id = req.params.id;
  const { value } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT v.*, a.ip_address FROM variables v
      JOIN automates a ON v.automate_id = a.id
      WHERE v.id = ?
    `, [id]);
    if (!rows.length) return res.status(404).json({ error: "Variable introuvable" });

    const v = rows[0];
    const client = new modbus();
    await client.connectTCP(v.ip_address, { port: 502 });

    if (v.register_type === "holding") {
      await client.writeRegister(v.register_address, parseInt(value));
    } else if (v.register_type === "coil") {
      await client.writeCoil(v.register_address, !!value);
    } else {
      return res.status(400).json({ error: "Type non supporté" });
    }

    res.json({ success: true });
  } catch (e) {
    console.error("Write error:", e);
    res.status(500).json({ error: "Erreur Modbus" });
  }
};
