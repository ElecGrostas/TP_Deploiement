const varSelect = document.getElementById("varSelect");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const exportBtn = document.getElementById("exportBtn");
const previewBody = document.getElementById("previewBody");

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

async function loadVars() {
  const vars = await apiGet("/variables");
  varSelect.innerHTML = vars.map(v =>
    `<option value="${v.id}">${v.name} (${v.automate_name})</option>`
  ).join("");
}

async function preview() {
  const variableId = varSelect.value;
  if (!variableId || !startDate.value || !endDate.value) return;

  const rows = await apiGet(
    `/history/${variableId}?start=${startDate.value} 00:00:00&end=${endDate.value} 23:59:59`
  );

  previewBody.innerHTML = rows.slice(0, 200).map(r => `
    <tr>
      <td>${new Date(r.timestamp).toLocaleString()}</td>
      <td>${r.value}</td>
    </tr>
  `).join("");
}

exportBtn.addEventListener("click", () => {
  const variableId = varSelect.value;
  if (!startDate.value || !endDate.value) {
    alert("Choisis une date début et une date fin.");
    return;
  }

  const url =
    `${API_BASE}/history/${variableId}/export?start=${startDate.value} 00:00:00&end=${endDate.value} 23:59:59`;

  window.open(url, "_blank");
});

varSelect.addEventListener("change", preview);
startDate.addEventListener("change", preview);
endDate.addEventListener("change", preview);

(async function init() {
  await loadVars();

  const today = new Date();
  startDate.value = formatDate(new Date(today.getTime() - 24 * 3600 * 1000));
  endDate.value = formatDate(today);

  await preview();
})();
