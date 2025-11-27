const { query } = require("../db");
const { restartSchedulers } = require("../services/scheduler.service");

exports.getAll = async (req, res) => {
  const rows = await query("SELECT * FROM automates ORDER BY id DESC");
  res.json(rows);
};

exports.create = async (req, res) => {
  const { name, ip_address } = req.body;
  if (!name || !ip_address) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const r = await query(
      "INSERT INTO automates (name, ip_address) VALUES (?, ?)",
      [name, ip_address]
    );

    const newId = Number(r.insertId);

    // On redémarre les timers (au cas où des variables existent déjà)
    await restartSchedulers();

    res.status(201).json({ id: newId });
  } catch (err) {
    if (err.errno === 1062) {
      return res.status(400).json({
        error: "Cette adresse IP est déjà enregistrée."
      });
    }

    console.error("[Automates] Erreur create:", err.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, ip_address } = req.body;

  await query(
    "UPDATE automates SET name = ?, ip_address = ? WHERE id = ?",
    [name, ip_address, id]
  );

  await restartSchedulers();
  res.json({ ok: true });
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  await query("DELETE FROM automates WHERE id = ?", [id]);
  await restartSchedulers();
  res.json({ ok: true });
};
