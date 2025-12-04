// backend/src/routes/variables.routes.js
const router = require("express").Router();
const c = require("../controllers/variables.controller");

router.get("/", c.getAll);
router.get("/:id", c.getOne);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

// Route d’écriture (en plus de celle déclarée dans server.js, c’est OK)
router.post("/:id/write", c.writeValue);

module.exports = router;
