const express = require("express");
const cors = require("cors");
require("dotenv").config();

const automatesRoutes = require("./routes/automates.routes");
const variablesRoutes = require("./routes/variables.routes");
const realtimeRoutes = require("./routes/realtime.routes");
const historyRoutes = require("./routes/history.routes");

const { startSchedulers } = require("./services/scheduler.service");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/automates", automatesRoutes);
app.use("/api/variables", variablesRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/history", historyRoutes);

app.get("/", (req, res) => res.send("Backend OK"));

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log("Backend running on port", port);
  await startSchedulers();
});
