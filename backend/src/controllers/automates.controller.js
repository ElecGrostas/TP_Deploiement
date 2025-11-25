const { query } = require("../db");

exports.getAll = async (req, res) => {
  const rows = await query("SELECT * FROM automates ORDER BY id DESC");
  res.json(rows);
};

exports.create = async (req, res) => {
  const { name, ip_address } = req.body;
  if (!name || !ip_address) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const r = await query(
    "INSERT INTO automates (name, ip_address) VALUES (?, ?)",
    [name, ip_address]
  );

  // ⚠️ insertId peut être un BigInt → on le convertit
  const newId = Number(r.insertId); // ou String(r.insertId) si tu préfères

  res.status(201).json({ id: newId });
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, ip_address } = req.body;

  await query(
    "UPDATE automates SET name = ?, ip_address = ? WHERE id = ?",
    [name, ip_address, id]
  );
  res.json({ ok: true });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await query("DELETE FROM automates WHERE id = ?", [id]);
  res.json({ ok: true });
};
