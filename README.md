# Competitor Analysis — Cash Management & Trade Finance

Outil interne qui présente l'activité des concurrents de BNP Paribas en cash management et trade finance dans les 193 États membres de l'ONU : une carte, des fiches pays, des fiches concurrents, un tableau filtrable et les sources.

Les données viennent d'un document Word produit à partir de sources ouvertes avec l'aide d'un modèle d'IA. **Toutes les informations sont faillibles** : l'outil le rappelle sur chaque écran et recalcule ses chiffres à partir du détail pays par pays.

> **Version 1.0** — 18/11/2026. Interface en français, anglais et néerlandais.

## Ce que fait l'outil

| Écran | Contenu |
| --- | --- |
| Carte | Monde coloré par concurrent (une couleur par banque) ou vue d'ensemble du nombre de concurrents sur place ; zoom par continent |
| Pays | Recherche dans les trois langues, filtre par continent, barre de présence des 10 concurrents par pays |
| Fiche pays | Mode de présence et date d'implantation de chaque concurrent, justification et sources |
| Concurrents | Fiche par banque : chiffres recalculés, couverture par continent, pays sur place, profil, visuel, sources réglementaires |
| Tableau | Matrice 193 pays × 10 concurrents, filtrable par continent, concurrent et type de présence |
| Méthode et sources | Avertissement de fiabilité, codes de présence, synthèse du document, gouvernance, 72 sources |
| Données *(admin)* | Import du `.docx` avec rapport de contrôle, historique, sauvegarde chiffrée |
| Publication *(admin)* | Publication de l'édition chiffrée dans le dossier réseau de l'équipe |
| Édition *(standard)* | Connexion au dossier de l'équipe ou chargement d'un fichier d'édition |

## Principes (identiques à MarCom CRM)

1. **Aucune sortie réseau** : la politique de sécurité (CSP) l'interdit ; carte, polices et données sont dans le fichier.
2. **Aucune donnée en clair** : coffre AES-GCM 256 dans le navigateur, mot de passe personnel, verrouillage après 10 minutes ; l'édition partagée est chiffrée avec la clé d'équipe.
3. **Un seul fichier autonome** par édition, utilisable hors ligne.

## Structure du dépôt

| Chemin | Contenu |
| --- | --- |
| `src/Competitor_Analysis_admin.html` | **Code source** : l'édition admin, que l'on modifie |
| `dist/` | Fichiers à livrer : édition admin, édition standard, empreintes `SHA256SUMS.txt` |
| `outils/fabriquer_standard.py` | Fabrique l'édition standard à partir de l'admin et contrôle les interdits |
| `outils/carte/` | Construction du fond de carte intégré (Natural Earth, domaine public) |
| `tests/e2e.cjs` | Test de bout en bout des deux éditions dans Chromium |
| `docs/` | Dossier technique et journal des versions |

Le document source `.docx` n'est pas versionné : il est importé dans l'outil par l'administrateur.

## Fabriquer et tester

```bash
python3 outils/fabriquer_standard.py
```

```bash
node tests/e2e.cjs chemin/vers/Activites_Mondiales_de_Cash_Management.docx
```

Le test demande Node.js et Playwright avec Chromium.

## Documentation

- [Dossier technique](docs/dossier-technique.md)
- [Journal des versions](docs/journal-des-versions.md)
