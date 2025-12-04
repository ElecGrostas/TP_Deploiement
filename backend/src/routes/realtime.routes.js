const router = require("express").Router();
const c = require("../controllers/realtime.controller");

router.get("/", c.getAllLastValues);
router.get("/:variableId", c.getLastValue);

module.exports = router;
