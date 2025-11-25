const router = require("express").Router();
const c = require("../controllers/history.controller");

router.get("/:variableId", c.getHistory);
router.get("/:variableId/export", c.exportCsv);

module.exports = router;
