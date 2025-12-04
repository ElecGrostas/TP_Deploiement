const { query } = require("../db");

exports.getLastValue = async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await query(
      "SELECT timestamp, value FROM history WHERE variable_id = ? ORDER BY timestamp DESC LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.json({
        timestamp: null,
        value: null
      });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("[Realtime] Erreur :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};
