// ecriture.js

import { writeVariable } from './api.js';

// Protection par mot de passe
const pwd = prompt("Mot de passe administrateur :");
fetch("/api/ecriture/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: pwd })
})
.then(res => {
  if (!res.ok) throw new Error("Accès refusé");
})
.catch(() => {
  alert("Mot de passe incorrect.");
  window.location.href = "index.html";
});

// Sélection des éléments
const writeForm = document.getElementById('write-form');
const variableSelect = document.getElementById('automateSelect');
const valueInput = document.getElementById('valueToWrite');
const resultBox = document.getElementById('resultBox');

// Dictionnaire des variables
let variableMap = {};

// Chargement dynamique des variables
async function loadVariables() {
  try {
    const res = await fetch('/api/variables');
    const variables = await res.json();

    variableSelect.innerHTML = '';
    variables.forEach(v => {
      const option = document.createElement('option');
      option.value = v.id;
      option.textContent = `${v.name} (${v.ip_address})`;
      variableMap[v.id] = v; // Stocker info pour l'écriture
      variableSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Erreur chargement variables', err);
    alert("Erreur lors du chargement des variables.");
  }
}

writeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const varId = variableSelect.value;
  const variable = variableMap[varId];
  const value = parseFloat(valueInput.value);

  if (!variable || isNaN(value)) {
    alert('Veuillez sélectionner une variable et entrer une valeur valide.');
    return;
  }

  try {
    const res = await writeVariable(variable.ip_address, variable.register_address, value);
    resultBox.textContent = `✅ Écriture réussie sur ${variable.name} : ${res.message}`;
    resultBox.classList.remove('text-danger');
    resultBox.classList.add('text-success');
  } catch (err) {
    resultBox.textContent = `❌ Erreur : ${err.message || 'Échec de l\'écriture'}`;
    resultBox.classList.remove('text-success');
    resultBox.classList.add('text-danger');
  }
});

// Charger les variables dès que la page est prête
loadVariables();
