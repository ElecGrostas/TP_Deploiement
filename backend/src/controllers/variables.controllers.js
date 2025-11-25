const { query } = require("../db");
const { restartSchedulers } = require("../services/scheduler.service");

exports.getAll = async (req, res) => {
  const rows = await query(`
    SELECT v.*, a.name AS automate_name, a.ip_address
    FROM variables v
    JOIN automates a ON a.id = v.automate_id
    ORDER BY v.id DESC
  `);
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const rows = await query(
    "SELECT * FROM variables WHERE id=?",
    [req.params.id]
  );
  res.json(rows[0] || null);
};

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

  const r = await query(`
    INSERT INTO variables
      (automate_id, name, register_address, register_type, frequency_sec, unit)
    VALUES (?,?,?,?,?,?)
  `, [
    automate_id,
    name,
    register_address,
    register_type || "holding",
    frequency_sec || 5,
    unit || null
  ]);

  await restartSchedulers();
  res.status(201).json({ id: r.insertId });
};

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

  await query(`
    UPDATE variables
    SET automate_id=?, name=?, register_address=?, register_type=?, frequency_sec=?, unit=?
    WHERE id=?
  `, [
    automate_id,
    name,
    register_address,
    register_type,
    frequency_sec,
    unit,
    id
  ]);

  await restartSchedulers();
  res.json({ ok: true });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await query("DELETE FROM variables WHERE id=?", [id]);
  await restartSchedulers();
  res.json({ ok: true });
};
