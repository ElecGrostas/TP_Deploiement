const { query } = require("../db");

exports.getLastValue = async (req, res) => {
  const { variableId } = req.params;

  const rows = await query(`
    SELECT value, timestamp
    FROM history
    WHERE variable_id=?
    ORDER BY timestamp DESC
    LIMIT 1
  `, [variableId]);

  res.json(rows[0] || null);
};

exports.getAllLastValues = async (req, res) => {
  const rows = await query(`
    SELECT h.variable_id, h.value, h.timestamp
    FROM history h
    JOIN (
      SELECT variable_id, MAX(timestamp) AS max_ts
      FROM history
      GROUP BY variable_id
    ) t ON t.variable_id=h.variable_id AND t.max_ts=h.timestamp
  `);

  res.json(rows);
};
