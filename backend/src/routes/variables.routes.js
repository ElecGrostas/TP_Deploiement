const router = require("express").Router();
const c = require("../controllers/variables.controller");

router.get("/", c.getAll);
router.get("/:id", c.getOne);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);
router.post("/:id/write", controller.writeValue);


module.exports = router;
