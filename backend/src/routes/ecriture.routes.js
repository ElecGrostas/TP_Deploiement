const express = require("express");
const router = express.Router();

router.post("/auth", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ access: true });
  }
  res.status(401).json({ access: false });
});

module.exports = router;
