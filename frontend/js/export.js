const backendUrl = localStorage.getItem("backendUrl") || "http://localhost:3001/api";

// Chargement des variables dans le select
async function chargerVariables() {
  const res = await fetch(`${backendUrl}/variables`);
  const variables = await res.json();
  const select = document.getElementById("varSelect");
  select.innerHTML = "<option value=''>-- Toutes les variables --</option>";

  for (const v of variables) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.unit || ""})`;
    select.appendChild(opt);
  }
}

// Affichage des données dans le tableau
async function chargerApercu() {
  const variableId = document.getElementById("varSelect").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let url = `${backendUrl}/history`;
  const params = [];

  if (variableId) params.push(`variableId=${variableId}`);
  if (start) params.push(`start=${start}`);
  if (end) params.push(`end=${end}`);
  if (params.length) url += "?" + params.join("&");

  const res = await fetch(url);
  const rows = await res.json();

  const body = document.getElementById("previewBody");
  body.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${new Date(row.timestamp).toLocaleString()}</td><td>${row.value}</td>`;
    body.appendChild(tr);
  }
}

// Export CSV avec les mêmes filtres
function exporterCSV() {
  const variableId = document.getElementById("varSelect").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let url = `${backendUrl}/history/export`;
  const params = [];

  if (variableId) params.push(`variableId=${variableId}`);
  if (start) params.push(`start=${start}`);
  if (end) params.push(`end=${end}`);
  if (params.length) url += "?" + params.join("&");

  window.open(url, "_blank");
}

// Lier les événements
document.getElementById("varSelect").addEventListener("change", chargerApercu);
document.getElementById("startDate").addEventListener("change", chargerApercu);
document.getElementById("endDate").addEventListener("change", chargerApercu);
document.getElementById("exportBtn").addEventListener("click", exporterCSV);

// Initialisation
chargerVariables().then(chargerApercu);
