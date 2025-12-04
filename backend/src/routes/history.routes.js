const express = require("express");
const router = express.Router();
const controller = require("../controllers/history.controller");

router.get("/", controller.getAll);
router.get("/export", controller.exportCSV);
router.get("/:id/export", controller.exportByVariable); // 👈 route avec paramètre

module.exports = router;
