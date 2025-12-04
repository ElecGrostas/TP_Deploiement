const { query } = require("../db");
const { Parser } = require("json2csv");

exports.getAll = async (req, res) => {
  try {
    const { variableId, start, end } = req.query;

    let sql = `
      SELECT h.id, v.name AS variable, h.value, h.timestamp
      FROM history h
      JOIN variables v ON h.variable_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (variableId) {
      sql += " AND h.variable_id = ?";
      params.push(variableId);
    }
    if (start) {
      sql += " AND h.timestamp >= ?";
      params.push(start);
    }
    if (end) {
      sql += " AND h.timestamp <= ?";
      params.push(end);
    }

    sql += " ORDER BY h.timestamp DESC";

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("[History] Erreur getAll:", err.message);
    res.status(500).json({ error: "Erreur récupération historique" });
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const { variableId, start, end } = req.query;

    let sql = `
      SELECT h.id, v.name AS variable, h.value, h.timestamp
      FROM history h
      JOIN variables v ON h.variable_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (variableId) {
      sql += " AND h.variable_id = ?";
      params.push(variableId);
    }
    if (start) {
      sql += " AND h.timestamp >= ?";
      params.push(start);
    }
    if (end) {
      sql += " AND h.timestamp <= ?";
      params.push(end);
    }

    sql += " ORDER BY h.timestamp DESC";

    const rows = await query(sql, params);
    const parser = new Parser({ fields: ["id", "variable", "value", "timestamp"] });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("historique_variables.csv");
    res.send(csv);
  } catch (err) {
    console.error("[Export CSV]", err.message);
    res.status(500).json({ error: "Erreur lors de l'export CSV" });
  }
};

exports.exportByVariable = async (req, res) => {
  const variableId = req.params.id;
  const { start, end } = req.query;

  let sql = `
    SELECT h.id, v.name AS variable, h.value, h.timestamp
    FROM history h
    JOIN variables v ON h.variable_id = v.id
    WHERE h.variable_id = ?
  `;
  const params = [variableId];

  if (start) {
    sql += " AND h.timestamp >= ?";
    params.push(start);
  }
  if (end) {
    sql += " AND h.timestamp <= ?";
    params.push(end);
  }

  try {
    const rows = await query(sql, params);
    const parser = new Parser({ fields: ["id", "variable", "value", "timestamp"] });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`variable_${variableId}_export.csv`);
    res.send(csv);
  } catch (err) {
    console.error("[Export CSV ID]", err.message);
    res.status(500).json({ error: "Erreur lors de l'export CSV par ID" });
  }
};
