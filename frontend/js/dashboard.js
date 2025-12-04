// frontend/js/dashboard.js

// =====================
//   ELEMENTS DOM
// =====================
const lastUpdateSpan    = document.getElementById("lastUpdate");

const kpiAutomates      = document.getElementById("kpiAutomates");
const kpiAutomatesDet   = document.getElementById("kpiAutomatesDetail");
const kpiVariables      = document.getElementById("kpiVariables");
const kpiVariablesDet   = document.getElementById("kpiVariablesDetail");
const kpiAlarms         = document.getElementById("kpiAlarms");
const kpiRefresh        = document.getElementById("kpiRefresh");

const automatesStatusEl = document.getElementById("automatesStatus");
const alarmsTableBody   = document.getElementById("alarmsTableBody");

const varSelect         = document.getElementById("varSelect");
const addChartBtn       = document.getElementById("addChartBtn");
const chartsContainer   = document.getElementById("chartsContainer");

// =====================
//   ETATS GLOBAUX
// =====================
let allVariables = [];
let allAutomates = [];

// Graphiques & données associées
const charts   = {};   // varId -> instance Chart
const buffers  = {};   // varId -> { labels:[], values:[], maxLen }
const timers   = {};   // varId -> setInterval

// Seuils et état d'alarme (stockage local)
const thresholds = {}; // varId -> { low, high, alarmState }

// =====================
//   HELPERS
// =====================

function findVariableById(id) {
  return allVariables.find(v => v.id === Number(id));
}

function formatTime(ts) {
  if (!ts) return "--:--:--";
  return new Date(ts).toLocaleTimeString();
}

// =====================
//   CHARGEMENT DONNÉES
// =====================

async function loadAutomates() {
  try {
    const data = await apiGet("/automates");
    allAutomates = Array.isArray(data) ? data : [];

    // KPI automates
    if (kpiAutomates) {
      kpiAutomates.textContent = allAutomates.length;
    }
    if (kpiAutomatesDet) {
      kpiAutomatesDet.textContent = allAutomates.length
        ? `${allAutomates.length} automate(s) configuré(s)`
        : "Aucun automate configuré";
    }

    // Bloc "État des automates"
    if (automatesStatusEl) {
      if (!allAutomates.length) {
        automatesStatusEl.innerHTML =
          '<span class="small-muted">Aucun automate configuré.</span>';
      } else {
        automatesStatusEl.innerHTML = allAutomates
          .map(
            (a) => `
          <div class="d-flex justify-content-between align-items-center border-bottom border-secondary py-1">
            <div>
              <div>${a.name}</div>
              <div class="small-muted">${a.ip_address}</div>
            </div>
            <span class="badge-soft">N/A</span>
          </div>`
          )
          .join("");
      }
    }
  } catch (err) {
    console.error("[Dashboard] Erreur loadAutomates :", err);
    if (automatesStatusEl) {
      automatesStatusEl.innerHTML =
        '<span class="small-muted text-danger">Erreur de chargement des automates</span>';
    }
  }
}

async function loadVariables() {
  try {
    const data = await apiGet("/variables");
    allVariables = Array.isArray(data) ? data : [];

    // KPI variables
    if (kpiVariables) {
      kpiVariables.textContent = allVariables.length;
    }
    if (kpiVariablesDet) {
      kpiVariablesDet.textContent = allVariables.length
        ? `${allVariables.length} variable(s) surveillée(s)`
        : "Aucune variable trouvée";
    }

    // KPI fréquence : plus petite fréquence de toutes les variables
    if (kpiRefresh) {
      const freqs = allVariables
        .map((v) => Number(v.frequency_sec || 0))
        .filter((f) => f > 0);

      const minFreq = freqs.length ? Math.min(...freqs) : null;
      kpiRefresh.textContent = minFreq ? `${minFreq} s` : "--";
    }

    // Remplir le select pour création de graphiques
    if (varSelect) {
      varSelect.innerHTML =
        '<option value="">Sélectionner une variable...</option>';
      allVariables.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.name} (${v.automate_name})`;
        varSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("[Dashboard] Erreur loadVariables :", err);
    if (kpiVariablesDet) {
      kpiVariablesDet.textContent = "Erreur de chargement des variables";
    }
  }
}

// KPI alarmes basé sur les seuils locaux
function updateAlarmsKPI() {
  let alarmCount = 0;
  Object.values(thresholds).forEach((th) => {
    if (!th) return;
    if (th.alarmState && th.alarmState !== "OK") alarmCount++;
  });
  if (kpiAlarms) {
    kpiAlarms.textContent = alarmCount;
  }
}

// =====================
//   ALARMES & SEUILS
// =====================

function updateThresholdInfo(varId) {
  const th = thresholds[varId];
  const infoEl = document.getElementById(`thresh-info-${varId}`);
  if (!infoEl || !th) return;

  const parts = [];
  if (th.low != null) parts.push(`min = ${th.low}`);
  if (th.high != null) parts.push(`max = ${th.high}`);

  infoEl.textContent = parts.length
    ? `Seuils : ${parts.join(" • ")}`
    : "Aucun seuil défini.";
}

function updateThresholdLines(varId) {
  const chart = charts[varId];
  const b = buffers[varId];
  const th = thresholds[varId];
  if (!chart || !b || !th) return;

  const len = b.values.length;
  chart.data.datasets[1].data = th.low != null ? Array(len).fill(th.low) : [];
  chart.data.datasets[2].data =
    th.high != null ? Array(len).fill(th.high) : [];
}

function applyThresholds(varId, value, variableName) {
  const th = thresholds[varId];
  if (!th) return;

  let newState = "OK";
  if (th.high != null && value > th.high) {
    newState = "ALERTE HAUTE";
  } else if (th.low != null && value < th.low) {
    newState = "ALERTE BASSE";
  }

  const badge = document.getElementById(`alarm-state-${varId}`);
  if (badge) {
    badge.textContent = `État : ${newState}`;
    if (newState === "OK") {
      badge.classList.remove("text-danger");
    } else {
      badge.classList.add("text-danger");
    }
  }

  // Si on passe de OK à alerte -> log
  if (newState !== "OK" && newState !== th.alarmState) {
    addAlarmRow(varId, variableName, value, newState);
  }

  th.alarmState = newState;
  updateAlarmsKPI();
}

function addAlarmRow(varId, variableName, value, state) {
  if (!alarmsTableBody) return;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${new Date().toLocaleTimeString()}</td>
    <td>${variableName} (#${varId})</td>
    <td>${value}</td>
    <td class="${state === "OK" ? "" : "text-danger"}">${state}</td>
  `;
  alarmsTableBody.prepend(tr);

  while (alarmsTableBody.rows.length > 50) {
    alarmsTableBody.deleteRow(alarmsTableBody.rows.length - 1);
  }
}

// =====================
//   GRAPHIQUES TEMPS RÉEL
// =====================

function createChartCard(variable) {
  const col = document.createElement("div");
  col.className = "col-12 col-lg-6";
  col.id = `chart-col-${variable.id}`;

  col.innerHTML = `
    <div class="card chart-card">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h6 class="mb-0">
            ${variable.name}
            <span class="small-muted ms-1">${variable.unit || ""}</span>
          </h6>
          <div class="small-muted">
            IP: ${variable.ip_address} • Reg: ${variable.register_address} • Freq: ${variable.frequency_sec || 5}s
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" id="remove-${variable.id}">Retirer</button>
      </div>

      <canvas id="chart-${variable.id}" height="180"></canvas>

      <div class="mt-3">
        <div class="row g-1 align-items-end">
          <div class="col-4">
            <label class="form-label mb-1">Seuil bas</label>
            <input type="number" class="form-control form-control-sm thresh-low" placeholder="min">
          </div>
          <div class="col-4">
            <label class="form-label mb-1">Seuil haut</label>
            <input type="number" class="form-control form-control-sm thresh-high" placeholder="max">
          </div>
          <div class="col-4">
            <button class="btn btn-sm btn-primary w-100 save-thresholds mt-4">
              Appliquer
            </button>
          </div>
        </div>
        <div class="small-muted mt-1" id="thresh-info-${variable.id}">
          Aucun seuil défini.
        </div>
        <div class="mt-1">
          <span class="badge-soft" id="alarm-state-${variable.id}">
            État : OK
          </span>
        </div>
      </div>
    </div>
  `;

  chartsContainer.appendChild(col);

  // Bouton retirer
  document
    .getElementById(`remove-${variable.id}`)
    .addEventListener("click", () => removeChart(variable.id));

  // Gestion des seuils
  const card = col.querySelector(".card");
  const lowInput = card.querySelector(".thresh-low");
  const highInput = card.querySelector(".thresh-high");
  const saveBtn = card.querySelector(".save-thresholds");

  thresholds[variable.id] = thresholds[variable.id] || {
    low: null,
    high: null,
    alarmState: "OK",
  };

  updateThresholdInfo(variable.id);

  saveBtn.addEventListener("click", () => {
    const lowRaw = lowInput.value.trim();
    const highRaw = highInput.value.trim();

    const low = lowRaw === "" ? null : Number(lowRaw);
    const high = highRaw === "" ? null : Number(highRaw);

    thresholds[variable.id].low = Number.isNaN(low) ? null : low;
    thresholds[variable.id].high = Number.isNaN(high) ? null : high;
    thresholds[variable.id].alarmState = "OK";

    updateThresholdInfo(variable.id);
    updateThresholdLines(variable.id);
    updateAlarmsKPI();
  });
}

function initChart(variable) {
  buffers[variable.id] = { labels: [], values: [], maxLen: 40 };

  const ctx = document.getElementById(`chart-${variable.id}`).getContext("2d");
  charts[variable.id] = new Chart(ctx, {
    type: "line",
    data: {
      labels: buffers[variable.id].labels,
      datasets: [
        {
          label: variable.name,
          data: buffers[variable.id].values,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: "Seuil bas",
          data: [],
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
        },
        {
          label: "Seuil haut",
          data: [],
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "#CFCFCF" } },
      },
      scales: {
        x: { ticks: { color: "#9A9A9A" }, grid: { color: "#222222" } },
        y: { ticks: { color: "#9A9A9A" }, grid: { color: "#222222" } },
      },
    },
  });
}

async function pollLastValue(variable) {
  try {
    const last = await apiGet(`/realtime/${variable.id}`);
    if (!last || last.value === null || last.value === undefined) return;

    const b = buffers[variable.id];
    const t = formatTime(last.timestamp);

    b.labels.push(t);
    b.values.push(last.value);

    if (b.labels.length > b.maxLen) {
      b.labels.shift();
      b.values.shift();
    }

    updateThresholdLines(variable.id);
    charts[variable.id].update();

    applyThresholds(variable.id, last.value, variable.name);

    if (lastUpdateSpan) {
      lastUpdateSpan.textContent = new Date().toLocaleTimeString();
    }
  } catch (err) {
    console.warn(
      "[Dashboard] Erreur pollLastValue variable",
      variable.id,
      err.message
    );
  }
}

function startTimer(variable) {
  if (timers[variable.id]) clearInterval(timers[variable.id]);

  const periodMs = (Number(variable.frequency_sec) || 5) * 1000;
  timers[variable.id] = setInterval(() => pollLastValue(variable), periodMs);
}

async function addChart() {
  if (!varSelect) return;

  const id = Number(varSelect.value);
  if (!id) return;

  // Déjà affiché ?
  if (charts[id]) return;

  let variable = findVariableById(id);

  // Si jamais la liste n'était pas à jour
  if (!variable) {
    await loadVariables();
    variable = findVariableById(id);
    if (!variable) return;
  }

  createChartCard(variable);
  initChart(variable);
  await pollLastValue(variable);
  startTimer(variable);
}

function removeChart(id) {
  if (timers[id]) clearInterval(timers[id]);
  if (charts[id]) charts[id].destroy();

  delete timers[id];
  delete charts[id];
  delete buffers[id];
  delete thresholds[id];

  const col = document.getElementById(`chart-col-${id}`);
  if (col) col.remove();

  updateAlarmsKPI();
}

// =====================
//   INIT
// =====================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadAutomates();
    await loadVariables();

    if (addChartBtn) {
      addChartBtn.addEventListener("click", addChart);
    }
  } catch (err) {
    console.error("[Dashboard] Erreur init dashboard :", err);
  }
});
