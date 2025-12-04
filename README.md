---

# 🖥️ **Supervision Modbus TCP – Interface Web complète**

Ce projet fournit une **solution complète de supervision industrielle** basée sur Modbus TCP, incluant :

* un **backend Node.js** (API Modbus + historisation + login admin),
* un **frontend HTML/JS** moderne (Bootstrap + Chart.js),
* une **base de données MariaDB** pour les historiques,
* un **système de scheduling** configurable pour les lectures automatiques,
* une **interface d’écriture sécurisée** vers les automates,
* un **dashboard temps réel** avec synoptique, graphes, alarmes et seuils,
* un **déploiement via Docker Compose** (frontend + backend + BDD).

---

## 📦 **Fonctionnalités principales**

### 🔧 **Configuration des automates et variables**

L’interface permet de configurer :

* les automates Modbus TCP (IP, nom),
* les variables associées (adresse, type de registre, fréquence de lecture),
* types Modbus supportés :

  * **coil** (FC1 / FC5),
  * **discrete input** (FC2),
  * **holding register** (FC3 / FC6),
  * **input register** (FC4).

Chaque mise à jour relance automatiquement le scheduler.

---

### 📊 **Dashboard temps réel**

Le dashboard propose :

* un **graphe principal** personnalisable,
* un **synoptique process** (Entrée ➜ Traitement ➜ Sortie),
* l’état des automates (ping / disponibilité),
* des **multi-graphiques** ajoutables à la volée,
* des **lignes de seuil** bas / haut,
* des **alertes visuelles** en cas de dépassement,
* une table des **événements / alarmes** (optionnelle).

---

### 📝 **Historisation & Export CSV**

Toutes les variables possédant une fréquence de lecture sont historisées dans MariaDB.

L’interface propose :

* la sélection de la période,
* la sélection des variables,
* l’export CSV complet via le backend.

---

### 🔐 **Écriture vers les automates**

Page sécurisée par mot de passe administrateur.

Fonctionnalités :

* sélection d’une variable Modbus,
* écriture via FC5 (coil) ou FC6 (holding),
* lecture immédiate du registre écrit (readback),
* gestion d’erreurs automates / timeout TCP.

⚠️ *Le programme automate doit utiliser le registre écrit pour que l’action soit effective.*

---

### 🛠️ **Backend Node.js**

Fonctionnalités côté API :

* lecture Modbus (FC1-4),
* écriture Modbus (FC5-6),
* historisation périodique,
* vérification d’état des automates,
* gestion des utilisateurs pour la page d’écriture,
* API REST complète :

  ```
  GET /api/automates
  GET /api/variables
  GET /api/realtime/:id
  POST /api/variables/:id/write
  POST /api/admin/login
  GET /api/export?var=..&from=..&to=..
  ```

---

### 🗄️ **Base de données MariaDB**

Tables principales :

* `automates`
* `variables`
* `history` (timestamp + variable + valeur)
* `alarms` (optionnel selon configuration)

L’initialisation est automatisée via `init_db.sql`.

---

### 🐳 **Déploiement via Docker**

Le projet inclut :

* **tp_backend** (Node.js API)
* **tp_frontend** (Nginx)
* **tp_mariadb** (base SQL)

Commande standard :

```bash
docker compose up --build
```

Arrêt :

```bash
docker compose down
```

---

## 📁 **Structure du projet**

```
project/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── server.js
│   ├── db.js
│   ├── package.json
│   └── init_db.sql
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── config.html
│   ├── export.html
│   ├── ecriture.html
│   ├── aide.html
│   ├── js/
│   └── css/
│
├── docker-compose.yml
├── README.md
└── .env
```

---

## ⚙️ **Configuration**

### `.env` requis

```
DB_HOST=tp_mariadb
DB_USER=root
DB_PASSWORD=xxxx
DB_NAME=supervision

ADMIN_PASSWORD=xxxx
```

### Ports exposés

| Service  | Port |
| -------- | ---- |
| Frontend | 8080 |
| Backend  | 3001 |
| MariaDB  | 3306 |

---

## 🚀 **Lancement local (hors Docker)**

### Backend

```
cd backend
npm install
node src/server.js
```

### Frontend

Servir avec n’importe quel serveur statique :

```
cd frontend
npx serve
```

Accessible via :

```
http://localhost:8080
```

---

## 🧪 Tests rapides

* Vérifier que l’automate répond :
  → Dashboard → État des automates
* Vérifier qu’une variable remonte bien :
  → Dashboard → graphe principal
* Vérifier l’écriture (admin) :
  → Écriture → test FC5 ou FC6
* Vérifier l’historisation :
  → Export → sélectionner une période

---

## 🔒 Sécurité & recommandations

* Ne pas exposer `/api/variables/:id/write` sur un réseau non sécurisé.
* Changer le mot de passe admin dans `.env`.
* Vérifier la configuration Modbus (coils vs holding).
* Documenter le mapping automate (PL7, EcoStruxure, TIA Portal).
* Adapter les fréquences si de nombreuses variables sont historisées.

---

## 🧰 Technologies utilisées

* Node.js (Express)
* modbus-serial
* MariaDB
* Docker & Docker Compose
* Bootstrap 5
* Chart.js
* Vanilla JavaScript
* Nginx (frontend)

