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
 *     elapsed // secondes écoulées depuis la dernière acquisition
 *   },
 *   ...
 * ]
 */
let varsState = [];

/**
 * Recharge toutes les variables depuis la base
 * et reconstruit l'état interne.
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
    `[Scheduler] Variables chargées : ${varsState.length} (timers en secondes)`
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

    // console.log(`[Scheduler] var ${id} = ${value}`);
  } catch (err) {
    console.error("[Scheduler] Erreur collectVariable:", err.message);
  }
}

/**
 * Tick global (appelé toutes les secondes).
 * Incrémente le compteur de chaque variable et déclenche la lecture
 * quand elapsed >= frequency_sec.
 */
async function tick() {
  if (!varsState.length) return;

  for (const v of varsState) {
    v.elapsed += 1;

    if (v.elapsed >= v.frequency_sec) {
      v.elapsed = 0;
      // on ne bloque pas la boucle si un automate répond lentement
      collectVariable(v);
    }
  }
}

/**
 * Démarre tous les timers :
 *  - recharge les variables
 *  - lance un setInterval(tick, 1000)
 */
async function startSchedulers() {
  // on nettoie un éventuel timer existant
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  await refreshVariables();

  timer = setInterval(tick, 1000);

  console.log("[Scheduler] Timers démarrés (tick = 1s)");
}

/**
 * Redémarre les timers après modification de la config
 * (ajout/suppression/édition de variables, d’automates, etc.)
 */
async function restartSchedulers() {
  console.log("[Scheduler] Redémarrage des timers…");
  await startSchedulers();
}

module.exports = {
  startSchedulers,
  restartSchedulers
};
