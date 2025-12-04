// frontend/js/dashboard.js

// ----- ELEMENTS DE BASE EXISTANTS -----
const varSelect = document.getElementById("varSelect");
const addChartBtn = document.getElementById("addChartBtn");
const chartsContainer = document.getElementById("chartsContainer");

// ----- ETATS -----
const charts = {};    // variableId -> Chart instance
const buffers = {};   // variableId -> {labels:[], values:[], maxLen}
const timers = {};    // variableId -> intervalId
const thresholds = {}; // variableId -> { low: number|null, high: number|null, alarmState: "OK"|"ALERTE HAUTE"|"ALERTE BASSE" }

// ---------- CHARGEMENT DE LA LISTE DES VARIABLES ----------
async function loadVariablesList() {
  const vars = await apiGet("/variables");
  varSelect.innerHTML = vars.map(v =>
    `<option value="${v.id}">
       ${v.name} (${v.automate_name})
     </option>`
  ).join("");
}

// ---------- CREATION D’UN WIDGET / CARTE DE GRAPHIQUE ----------
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
            Freq: ${variable.frequency_sec}s • IP: ${variable.ip_address} • Reg: ${variable.register_address}
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" id="remove-${variable.id}">Retirer</button>
      </div>

      <canvas id="chart-${variable.id}" height="200"></canvas>

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
            Etat : OK
          </span>
        </div>
      </div>
    </div>
  `;

  chartsContainer.appendChild(col);

  // Bouton "Retirer"
  document.getElementById(`remove-${variable.id}`).addEventListener("click", () => {
    removeChart(variable.id);
  });

  // Gestion des seuils pour cette variable
  const card = col.querySelector(".card");
  const lowInput = card.querySelector(".thresh-low");
  const highInput = card.querySelector(".thresh-high");
  const saveBtn = card.querySelector(".save-thresholds");

  // init état seuils
  thresholds[variable.id] = {
    low: null,
    high: null,
    alarmState: "OK"
  };

  saveBtn.addEventListener("click", () => {
    const lowRaw = lowInput.value.trim();
    const highRaw = highInput.value.trim();

    const low = lowRaw === "" ? null : Number(lowRaw);
    const high = highRaw === "" ? null : Number(highRaw);

    thresholds[variable.id].low = Number.isNaN(low) ? null : low;
    thresholds[variable.id].high = Number.isNaN(high) ? null : high;
    thresholds[variable.id].alarmState = "OK"; // reset état

    updateThresholdInfo(variable.id);
    // On redessine les lignes de seuil si le graphe existe déjà
    updateThresholdLines(variable.id);
  });
}

// ---------- CREATION / CONFIG DU GRAPH CHART.JS ----------
function initChart(variable) {
  buffers[variable.id] = { labels: [], values: [], maxLen: 30 };

  const ctx = document.getElementById(`chart-${variable.id}`);
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
          borderWidth: 2
        },
        {
          label: "Seuil bas",
          data: [],
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0
        },
        {
          label: "Seuil haut",
          data: [],
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: {
          labels: { color: "#CFCFCF" }
        }
      },
      scales: {
        x: { ticks: { color: "#9A9A9A" }, grid: { color: "#222222" } },
        y: { ticks: { color: "#9A9A9A" }, grid: { color: "#222222" } }
      }
    }
  });
}

// ---------- LECTURE D’UN POINT TEMPS RÉEL ----------
async function pollLastValue(variable) {
  const last = await apiGet(`/realtime/${variable.id}`);
  if (!last) return;

  const b = buffers[variable.id];

  const t = new Date(last.timestamp).toLocaleTimeString();
  b.labels.push(t);
  b.values.push(last.value);

  if (b.labels.length > b.maxLen) {
    b.labels.shift();
    b.values.shift();
  }

  // Mise à jour des lignes de seuil dans le dataset
  updateThresholdLines(variable.id);

  charts[variable.id].update();

  // Application logique d’alarme (seuils)
  applyThresholds(variable.id, last.value, variable.name);
}

// ---------- TIMER DE POLLING ----------
function startTimer(variable) {
  if (timers[variable.id]) clearInterval(timers[variable.id]);
  timers[variable.id] = setInterval(
    () => pollLastValue(variable),
    variable.frequency_sec * 1000
  );
}

// ---------- AJOUT D’UN NOUVEAU GRAPHIQUE ----------
async function addChart() {
  const id = parseInt(varSelect.value, 10);
  if (!id) return;
  if (charts[id]) return; // déjà affiché

  const vars = await apiGet("/variables");
  const variable = vars.find(v => v.id === id);
  if (!variable) return;

  createChartCard(variable);
  initChart(variable);
  await pollLastValue(variable);
  startTimer(variable);
}

// ---------- SUPPRESSION D’UN GRAPHIQUE ----------
function removeChart(id) {
  if (timers[id]) clearInterval(timers[id]);
  if (charts[id]) charts[id].destroy();

  delete timers[id];
  delete charts[id];
  delete buffers[id];
  delete thresholds[id];

  const col = document.getElementById(`chart-col-${id}`);
  if (col) col.remove();
}

// ---------- INFO TEXTE SUR LES SEUILS ----------
function updateThresholdInfo(variableId) {
  const infoEl = document.getElementById(`thresh-info-${variableId}`);
  if (!infoEl) return;

  const th = thresholds[variableId];
  if (!th) {
    infoEl.textContent = "Aucun seuil défini.";
    return;
  }

  const parts = [];
  if (th.low != null) parts.push(`min = ${th.low}`);
  if (th.high != null) parts.push(`max = ${th.high}`);

  infoEl.textContent = parts.length
    ? `Seuils : ${parts.join(" • ")}`
    : "Aucun seuil défini.";
}

// ---------- MISE À JOUR DES LIGNES DE SEUIL DANS LE CHART ----------
function updateThresholdLines(variableId) {
  const chart = charts[variableId];
  const b = buffers[variableId];
  const th = thresholds[variableId];

  if (!chart || !b || !th) return;

  const len = b.values.length;

  const lowData = th.low != null ? Array(len).fill(th.low) : [];
  const highData = th.high != null ? Array(len).fill(th.high) : [];

  // dataset[0] = data
  // dataset[1] = seuil bas
  // dataset[2] = seuil haut
  chart.data.datasets[1].data = lowData;
  chart.data.datasets[2].data = highData;
}

// ---------- LOGIQUE D’ALARME ----------
function applyThresholds(variableId, value, variableName) {
  const th = thresholds[variableId];
  if (!th) return;

  let newState = "OK";
  if (th.high != null && value > th.high) {
    newState = "ALERTE HAUTE";
  } else if (th.low != null && value < th.low) {
    newState = "ALERTE BASSE";
  }

  const badge = document.getElementById(`alarm-state-${variableId}`);
  if (badge) {
    badge.textContent = `Etat : ${newState}`;
    if (newState === "OK") {
      badge.classList.remove("text-danger");
    } else {
      badge.classList.add("text-danger");
    }
  }

  // On évite de spammer le log en ne loggant que les changements d'état
  if (newState !== "OK" && newState !== th.alarmState) {
    addAlarmRow(variableId, variableName, value, newState);
  }

  th.alarmState = newState;
}

// ---------- TABLEAU D’ALARMES (OPTIONNEL) ----------
function addAlarmRow(variableId, variableName, value, state) {
  const tbody = document.getElementById("alarmsTableBody");
  if (!tbody) return; // si tu n'as pas mis de tableau d’alarme dans le HTML, on ignore

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${new Date().toLocaleTimeString()}</td>
    <td>${variableName} (#${variableId})</td>
    <td>${value}</td>
    <td class="${state === "OK" ? "" : "text-danger"}">${state}</td>
  `;

  // On ajoute en haut
  tbody.prepend(tr);

  // On garde par ex. les 30 dernières
  while (tbody.rows.length > 30) {
    tbody.deleteRow(tbody.rows.length - 1);
  }
}

// ---------- EVENTS ----------
addChartBtn.addEventListener("click", addChart);

// ---------- INIT ----------
(async function init() {
  await loadVariablesList();
})();
