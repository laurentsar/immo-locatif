/*
 * data.js — données de référence INDICATIVES (2025), éditables dans l'app.
 * prix = €/m² à l'achat ; loyer = €/m²/mois (loyer mensuel par m²).
 * trend = tendance prix sur 12 mois (%). risk = 1 (faible) à 3 (élevé).
 * Marrakech : prix convertis en € (indicatif), location souvent saisonnière.
 * ⚠️ Chiffres indicatifs à ajuster — ce ne sont PAS des données officielles live
 *    (sauf DVF Toulouse, récupéré en direct dans l'app).
 */
window.IMMO_DATA = {
  devise: '€',
  marches: [
    {
      id: 'toulouse', nom: 'Toulouse', pays: 'France', drapeau: '🇫🇷', fisc: 'fr',
      note: 'Marché tendu, forte demande étudiante et cadres (aéronautique). DVF réel dispo.',
      quartiers: [
        { nom: 'Capitole / Centre',       prix: 5200, loyer: 15.5, trend: 1.5, risk: 1 },
        { nom: 'Les Carmes',              prix: 5500, loyer: 16.0, trend: 1.0, risk: 1 },
        { nom: 'Saint-Cyprien',           prix: 4300, loyer: 14.5, trend: 2.0, risk: 1 },
        { nom: 'Les Chalets / J. d\'Arc', prix: 4200, loyer: 15.0, trend: 1.8, risk: 1 },
        { nom: 'Saint-Michel',            prix: 3900, loyer: 14.0, trend: 1.5, risk: 1 },
        { nom: 'Compans-Caffarelli',      prix: 4000, loyer: 14.5, trend: 1.2, risk: 1 },
        { nom: 'Minimes',                 prix: 3300, loyer: 13.0, trend: 2.2, risk: 2 },
        { nom: 'Rangueil (étudiants)',    prix: 3400, loyer: 13.5, trend: 1.0, risk: 1 },
        { nom: 'Borderouge',              prix: 3300, loyer: 13.0, trend: 2.5, risk: 2 },
        { nom: 'Empalot',                 prix: 2600, loyer: 12.0, trend: 3.0, risk: 3 },
        { nom: 'Le Mirail / Reynerie',    prix: 1800, loyer: 11.0, trend: 0.5, risk: 3 },
      ],
    },
    {
      id: 'espagne', nom: 'Espagne', pays: 'Espagne', drapeau: '🇪🇸', fisc: 'es',
      note: 'Non-résident UE : IRPF 19% sur le loyer net. IBI (taxe foncière) locale. Forte demande touristique côtière.',
      quartiers: [
        { nom: 'Barcelone',       prix: 4500, loyer: 18.0, trend: 3.0, risk: 2 },
        { nom: 'Madrid',          prix: 4200, loyer: 17.0, trend: 3.5, risk: 2 },
        { nom: 'Valence',         prix: 2300, loyer: 12.0, trend: 5.0, risk: 2 },
        { nom: 'Malaga',          prix: 2900, loyer: 13.5, trend: 6.0, risk: 2 },
        { nom: 'Alicante',        prix: 2000, loyer: 11.0, trend: 4.0, risk: 2 },
        { nom: 'Séville',         prix: 2300, loyer: 12.0, trend: 3.5, risk: 2 },
        { nom: 'Marbella',        prix: 3800, loyer: 15.0, trend: 4.5, risk: 2 },
      ],
    },
    {
      id: 'marrakech', nom: 'Marrakech', pays: 'Maroc', drapeau: '🇲🇦', fisc: 'ma',
      note: 'Prix indicatifs en € (marché en MAD). Location souvent SAISONNIÈRE (Airbnb) → rendement brut plus élevé mais variable. Fiscalité locative marocaine.',
      quartiers: [
        { nom: 'Guéliz',            prix: 1600, loyer: 6.0, trend: 3.0, risk: 2 },
        { nom: 'Hivernage',         prix: 2200, loyer: 7.5, trend: 2.5, risk: 2 },
        { nom: 'Médina (riads)',    prix: 1500, loyer: 6.5, trend: 2.0, risk: 3 },
        { nom: 'Palmeraie',         prix: 1400, loyer: 6.0, trend: 2.0, risk: 3 },
        { nom: 'Agdal',             prix: 1200, loyer: 5.5, trend: 3.5, risk: 2 },
        { nom: 'Targa',             prix: 1100, loyer: 5.0, trend: 3.0, risk: 2 },
        { nom: 'Route Ourika (péri.)', prix: 900, loyer: 4.5, trend: 4.0, risk: 3 },
      ],
    },
  ],

  // Presets fiscaux/charges par marché (simulateur). charges = % du loyer (gestion,
  // vacance, entretien) ; taxeMois = taxe foncière ~ N mois de loyer ; imp = taux
  // d'imposition sur le revenu net foncier (indicatif).
  fisc: {
    fr: { label: 'France (nu, régime réel simplifié)', charges: 22, taxeMois: 1.0, imp: 30, note: 'Hors prélèvements sociaux 17.2% détaillés ; LMNP possible (amortissement).' },
    es: { label: 'Espagne (non-résident UE)', charges: 20, taxeMois: 0.8, imp: 19, note: 'IRPF 19% sur le net ; IBI local ; réduction 60% réservée aux résidents.' },
    ma: { label: 'Maroc (location résidentielle)', charges: 25, taxeMois: 0.5, imp: 20, note: 'Abattement 40% puis barème ; saisonnier = régime distinct.' },
  },

  // Flux d'actualités marché (Google News RSS, stable) par marché.
  news: {
    toulouse: 'https://news.google.com/rss/search?q=immobilier%20locatif%20Toulouse&hl=fr&gl=FR&ceid=FR:fr',
    espagne:  'https://news.google.com/rss/search?q=mercado%20inmobiliario%20alquiler%20Espa%C3%B1a&hl=es&gl=ES&ceid=ES:es',
    marrakech:'https://news.google.com/rss/search?q=immobilier%20Marrakech%20investissement&hl=fr&gl=FR&ceid=FR:fr',
  },

  // Biens DISPONIBLES : pas d'API gratuite → on ouvre les annonces réelles du
  // portail du pays, pré-filtrées par quartier (le clic quitte l'app vers le site).
  listings: {
    toulouse: q => 'https://www.leboncoin.fr/recherche?category=9&text=' + encodeURIComponent(q + ' Toulouse'),
    espagne:  q => 'https://www.google.com/search?q=' + encodeURIComponent('venta piso ' + q + ' site:idealista.com'),
    marrakech:q => 'https://www.google.com/search?q=' + encodeURIComponent('vente appartement ' + q + ' Marrakech site:avito.ma'),
  },

  // DVF (ventes réelles) — CSV officiel géo-DVF par commune. Toulouse = 31555.
  dvf: {
    toulouse: {
      code: '31555', dept: '31',
      url: y => `https://geo-dvf.s3.sbg.io.cloud.ovh.net/latest/csv/${y}/communes/31/31555.csv`,
      annee: 2024,
    },
  },
};
