const cron = require("node-cron");
const { query } = require("../db");
const { readRegister } = require("./modbus.service");

let jobs = [];

async function loadVariables() {
  return await query(`
    SELECT v.*, a.ip_address
    FROM variables v
    JOIN automates a ON a.id = v.automate_id
  `);
}

function clearJobs() {
  jobs.forEach(j => j.stop());
  jobs = [];
}

async function createJobs() {
  const vars = await loadVariables();

  vars.forEach(v => {
    const freq = Math.max(1, v.frequency_sec || 5);
    const expr = `*/${freq} * * * * *`;

    const job = cron.schedule(expr, async () => {
      try {
        const val = await readRegister(
          v.ip_address,
          v.register_address,
          v.register_type
        );

        await query(
          "INSERT INTO history (variable_id, value) VALUES (?,?)",
          [v.id, val]
        );
      } catch (e) {
        console.error("Read error for variable", v.id, e.message);
      }
    });

    jobs.push(job);
  });
}

exports.startSchedulers = async () => {
  clearJobs();
  await createJobs();
  console.log("Schedulers started");
};

exports.restartSchedulers = async () => {
  await exports.startSchedulers();
};
