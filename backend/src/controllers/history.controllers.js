const { query } = require("../db");
const { makeCsv } = require("../services/csv.service");

exports.getHistory = async (req, res) => {
  const { variableId } = req.params;
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "start and end query params required" });
  }

  const rows = await query(`
    SELECT timestamp, value
    FROM history
    WHERE variable_id=?
      AND timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
  `, [variableId, start, end]);

  res.json(rows);
};

exports.exportCsv = async (req, res) => {
  const { variableId } = req.params;
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "start and end query params required" });
  }

  const rows = await query(`
    SELECT timestamp, value
    FROM history
    WHERE variable_id=?
      AND timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
  `, [variableId, start, end]);

  const csv = makeCsv(rows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=variable_${variableId}.csv`
  );
  res.send(csv);
};
