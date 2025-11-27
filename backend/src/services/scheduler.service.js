const { query } = require("../db");
const { readRegister } = require("./modbus.service");

let timer = null;

/**
 * Structure interne :
 * varsState = [
 *   {
 *     id,
 *     automate_id,
 *     ip_address,
 *     register_address,
 *     register_type,
 *     frequency_sec,
 *     elapsed
 *   }, ...
 * ]
 */
let varsState = [];

/**
 * Recharge toutes les variables (avec IP automate) depuis la base.
 * Si aucune variable → varsState = [] et pas de ping.
 */
async function refreshVariables() {
  const rows = await query(`
    SELECT
      v.id,
      v.automate_id,
      v.register_address,
      v.register_type,
      v.frequency_sec,
      a.ip_address
    FROM variables v
    JOIN automates a ON a.id = v.automate_id
    ORDER BY v.id ASC
  `);

  if (!rows.length) {
    varsState = [];
    console.log("[Scheduler] Aucune variable/automate configuré → aucun ping.");
    return;
  }

  varsState = rows.map((v) => ({
    id: v.id,
    automate_id: v.automate_id,
    ip_address: v.ip_address,
    register_address: v.register_address,
    register_type: v.register_type,
    frequency_sec: v.frequency_sec || 5,
    elapsed: 0
  }));

  console.log(
    `[Scheduler] Variables chargées : ${varsState.length} (ping actifs).`
  );
}

/**
 * Lecture et enregistrement d'une variable.
 */
async function collectVariable(state) {
  try {
    const { id, ip_address, register_address, register_type } = state;

    const value = await readRegister(
      ip_address,
      register_address,
      register_type
    );

    if (value === null) {
      console.warn(
        `[Scheduler] Lecture échouée pour variable ${id} (${ip_address}, reg ${register_address})`
      );
      return;
    }

    await query(
      "INSERT INTO history (variable_id, value) VALUES (?, ?)",
      [id, value]
    );
  } catch (err) {
    console.error("[Scheduler] Erreur collectVariable:", err.message);
  }
}

/**
 * Tick global (1 fois par seconde).
 * Si aucune variable → ne fait rien.
 */
async function tick() {
  if (!varsState.length) return;

  for (const v of varsState) {
    v.elapsed += 1;

    if (v.elapsed >= v.frequency_sec) {
      v.elapsed = 0;
      collectVariable(v);
    }
  }
}

/**
 * Démarre les timers :
 *  - recharge les variables
 *  - si au moins 1 variable → setInterval
 *  - sinon → pas de timer
 */
async function startSchedulers() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  await refreshVariables();

  if (!varsState.length) {
    console.log("[Scheduler] Pas de variables → timers non démarrés.");
    return;
  }

  timer = setInterval(tick, 1000);
  console.log("[Scheduler] Timers démarrés (tick = 1s).");
}

/**
 * Redémarre les timers après modification de la config.
 */
async function restartSchedulers() {
  console.log("[Scheduler] Redémarrage des timers…");
  await startSchedulers();
}

module.exports = {
  startSchedulers,
  restartSchedulers
};
