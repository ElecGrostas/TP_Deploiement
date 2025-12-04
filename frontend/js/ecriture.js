// ecriture.js

import { writeVariable, getVariables } from './api.js';

const writeForm = document.getElementById('write-form');
const automateSelect = document.getElementById('automateSelect');
const variableSelect = document.getElementById('variableSelect'); // <select> pour les variables
const valueInput = document.getElementById('valueToWrite');
const resultBox = document.getElementById('resultBox');

/**
 * Charge la liste des variables depuis la DB (via l'API)
 * et remplit le select #variableSelect
 */
async function loadVariables() {
  try {
    const variables = await getVariables(); 
    // ⬆️ ADAPTE ce nom si besoin : même fonction que dans config.html

    if (!Array.isArray(variables) || variables.length === 0) {
      variableSelect.innerHTML = `
        <option disabled selected>Aucune variable configurée</option>
      `;
      return;
    }

    // Option par défaut
    variableSelect.innerHTML = `
      <option value="" disabled selected>-- Sélectionner une variable --</option>
    `;

    // On suppose que chaque variable ressemble à :
    // { id, name, address } ou { id, nom, registre }
    variables.forEach(v => {
      const option = document.createElement('option');

      // 💡 ADAPTE ces champs selon ton modèle en DB
      option.value = v.address ?? v.registre ?? v.register;
      option.textContent = v.name ?? v.nom ?? `Var ${v.id}`;
      option.dataset.id = v.id;

      variableSelect.appendChild(option);
    });

  } catch (err) {
    console.error('Erreur lors du chargement des variables :', err);
    variableSelect.innerHTML = `
      <option disabled selected>Erreur chargement variables</option>
    `;
  }
}

// Soumission du formulaire d’écriture
writeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const automateIp = automateSelect.value;
  const selectedOption = variableSelect.options[variableSelect.selectedIndex];
  const selectedRegister = selectedOption ? selectedOption.value : '';

  const registerAddress = parseInt(selectedRegister, 10);
  const value = parseFloat(valueInput.value);

 async function writeValue(e) {
  e.preventDefault();
  const id = document.getElementById("varSelect").value;
  const val = document.getElementById("valToSend").value;

  if (!id) return alert("Veuillez sélectionner une variable");

  try {
    const result = await apiPost(`/variables/${id}/write`, { value: val });

    console.log("Résultat backend:", result);

    if (result.success) {
      alert(
        "✔ Écriture réussie\n" +
        "Valeur envoyée : " + result.written + "\n" +
        "Valeur relue   : " + result.readback + "\n\n" +
        "Debug:\n" +
        "IP : " + result.debug.ip + "\n" +
        "Registre : " + result.debug.addr + "\n" +
        "Type : " + result.debug.type
      );
    } else {
      alert("Erreur backend : " + JSON.stringify(result));
    }

  } catch (err) {
    alert("Erreur technique : " + err.message);
  }
}



  try {
    const res = await writeVariable(automateIp, registerAddress, value);

    resultBox.innerText = `Écriture réussie sur ${selectedOption.textContent} (registre ${registerAddress}) : ${JSON.stringify(res)}`;
  } catch (err) {
    console.error('Erreur écriture :', err);
    resultBox.innerText = `Erreur lors de l’écriture : ${err.message ?? err}`;
  }
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  loadVariables();
});
