# Immo Locatif 🏠

Application **PWA + APK** (Capacitor) d'aide à l'investissement **locatif** sur 3 marchés :
**Toulouse**, **Espagne**, **Marrakech** — sur le modèle d'une appli de reco.

## Fonctions
- 📊 **Score d'opportunité par quartier** : prix €/m², loyer €/m², **rentabilité brute (%)**,
  **nb d'années pour rentabiliser**, tendance, note /10 + reco Acheter / Surveiller / Éviter.
- 🧮 **Simulateur** : prix, surface, loyer, crédit, charges → rentabilité brute/nette,
  **cashflow mensuel**, retour sur investissement, mensualité, avec **fiscalité par pays** (FR/ES/MA).
- 📰 **Actus marché** : flux Google News par marché + **sentiment** haussier/baissier.
- 🏛️ **Prix réels DVF (Toulouse)** : ventes réelles de la base officielle DVF (data.gouv.fr),
  prix/m² **médian par code postal**.
- 🔎 **Biens disponibles** : liens directs vers les annonces réelles du portail du pays
  (LeBonCoin / Idealista / Avito), pré-filtrées par quartier.
- ✏️ Données de référence **éditables** (localStorage), réinitialisables.

## Données — précision
Les prix/loyers par quartier sont **indicatifs** (éditables) : il n'existe **pas** d'API officielle
gratuite temps réel pour l'Espagne/Marrakech, ni d'API gratuite légale de **biens disponibles**
(d'où les liens vers les portails). Seul **DVF** (Toulouse, ventes passées) est une donnée officielle
récupérée en direct. **Rien dans l'app n'est un conseil en investissement.**

## Build
- **APK** : GitHub Actions (`.github/workflows/build-apk.yml`) à chaque push `master` → Release signée.
- MAJ in-app : plugin natif `UpdatePlugin` (télécharge + installe l'APK) + `update-check.js`.
- Bump version : `package.json`, `www/index.html` (`APP_VERSION`), `www/sw.js` (`CACHE`),
  `android/app/build.gradle` (`versionCode`+`versionName`).

## Structure
- `www/data.js` — données de référence (marchés/quartiers, fiscalité, flux, DVF, liens portails).
- `www/app.js` — logique (score, simulateur, actus/sentiment, DVF, MAJ).
- `android/` — projet Capacitor (keystore partagé, plugin MAJ).
