// --------- BACKEND URL SETTINGS UI ----------
const apiBaseInput = document.getElementById("apiBaseInput");
const saveApiBase = document.getElementById("saveApiBase");

apiBaseInput.value = localStorage.getItem("apiBase") || "http://localhost:3000/api";

saveApiBase.addEventListener("click", () => {
  localStorage.setItem("apiBase", apiBaseInput.value.trim());
  location.reload();
});

// --------- DOM ELEMENTS ----------
const automateForm = document.getElementById("automateForm");
const variableForm = document.getElementById("variableForm");

const varAutomate = document.getElementById("varAutomate");
const varsTable = document.getElementById("varsTable");
const refreshBtn = document.getElementById("refreshBtn");

const automateMsg = document.getElementById("automateMsg");
const varMsg = document.getElementById("varMsg");

// --------- LOADERS ----------
async function loadAutomates() {
  const automates = await apiGet("/automates");
  varAutomate.innerHTML = automates.map(a =>
    `<option value="${a.id}">${a.name} (${a.ip_address})</option>`
  ).join("");
}

async function loadVariables() {
  const vars = await apiGet("/variables");

  varsTable.innerHTML = vars.map(v => `
    <tr>
      <td><span class="badge-soft">${v.name}</span></td>
      <td>${v.automate_name}</td>
      <td>${v.ip_address}</td>
      <td>${v.register_address}</td>
      <td>${v.register_type}</td>
      <td>${v.frequency_sec}s</td>
      <td>${v.unit || ""}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-secondary" onclick="deleteVar(${v.id})">
          Supprimer
        </button>
      </td>
    </tr>
  `).join("");
}

window.deleteVar = async (id) => {
  if (!confirm("Supprimer cette variable ?")) return;
  await apiDelete(`/variables/${id}`);
  await loadVariables();
};

// --------- FORM EVENTS ----------
automateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("automateName").value.trim();
  const ip_address = document.getElementById("automateIp").value.trim();

  try {
    await apiPost("/automates", { name, ip_address });
    automateMsg.textContent = "Automate ajouté ✅";
    automateForm.reset();
    await loadAutomates();
  } catch (err) {
    automateMsg.textContent = "Erreur : " + err.message;
  }
});

variableForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    automate_id: parseInt(varAutomate.value, 10),
    name: document.getElementById("varName").value.trim(),
    register_address: parseInt(document.getElementById("varRegister").value, 10),
    register_type: document.getElementById("varType").value,
    frequency_sec: parseInt(document.getElementById("varFreq").value, 10),
    unit: document.getElementById("varUnit").value.trim() || null
  };

  try {
    await apiPost("/variables", body);
    varMsg.textContent = "Variable ajoutée ✅";
    variableForm.reset();
    await loadVariables();
  } catch (err) {
    varMsg.textContent = "Erreur : " + err.message;
  }
});

refreshBtn.addEventListener("click", loadVariables);

// --------- INIT ----------
(async function init() {
  await loadAutomates();
  await loadVariables();
})();
