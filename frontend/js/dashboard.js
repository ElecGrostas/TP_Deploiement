const varSelect = document.getElementById("varSelect");
const addChartBtn = document.getElementById("addChartBtn");
const chartsContainer = document.getElementById("chartsContainer");

const charts = {};   // variableId -> Chart instance
const buffers = {};  // variableId -> {labels:[], values:[], maxLen}
const timers = {};   // variableId -> intervalId

async function loadVariablesList() {
  const vars = await apiGet("/variables");
  varSelect.innerHTML = vars.map(v =>
    `<option value="${v.id}">
       ${v.name} (${v.automate_name})
     </option>`
  ).join("");
}

function createChartCard(variable) {
  const col = document.createElement("div");
  col.className = "col-12 col-lg-6";
  col.id = `chart-col-${variable.id}`;

  col.innerHTML = `
    <div class="card chart-card">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">
          ${variable.name}
          <span class="small-muted ms-1">${variable.unit || ""}</span>
        </h6>
        <button class="btn btn-sm btn-secondary" id="remove-${variable.id}">Retirer</button>
      </div>

      <canvas id="chart-${variable.id}" height="200"></canvas>

      <div class="small-muted mt-2">
        Freq: ${variable.frequency_sec}s • IP: ${variable.ip_address} • Registre: ${variable.register_address}
      </div>
    </div>
  `;

  chartsContainer.appendChild(col);

  document.getElementById(`remove-${variable.id}`).addEventListener("click", () => {
    removeChart(variable.id);
  });
}

function initChart(variable) {
  buffers[variable.id] = { labels: [], values: [], maxLen: 30 };

  const ctx = document.getElementById(`chart-${variable.id}`);
  charts[variable.id] = new Chart(ctx, {
    type: "line",
    data: {
      labels: buffers[variable.id].labels,
      datasets: [{
        label: variable.name,
        data: buffers[variable.id].values,
        tension: 0.25,
        pointRadius: 2,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { labels: { color: "#CFCFCF" } } },
      scales: {
        x: { ticks: { color: "#9A9A9A" }, grid: { color: "#222222" } },
        y: { ticks: { color: "#9A9A9A" }, grid: { color: "#222222" } }
      }
    }
  });
}

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

  charts[variable.id].update();
}

function startTimer(variable) {
  if (timers[variable.id]) clearInterval(timers[variable.id]);
  timers[variable.id] = setInterval(
    () => pollLastValue(variable),
    variable.frequency_sec * 1000
  );
}

async function addChart() {
  const id = parseInt(varSelect.value, 10);
  if (charts[id]) return;

  const vars = await apiGet("/variables");
  const variable = vars.find(v => v.id === id);
  if (!variable) return;

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

  const col = document.getElementById(`chart-col-${id}`);
  if (col) col.remove();
}

addChartBtn.addEventListener("click", addChart);

(async function init() {
  await loadVariablesList();
})();
