# Competitor Analysis — Cash Management & Trade Finance

Outil interne qui présente l'activité des concurrents de BNP Paribas en cash management et trade finance dans les 193 États membres de l'ONU : une carte, des fiches pays, des fiches concurrents, un tableau filtrable et les sources.

Les données viennent d'un document Word produit à partir de sources ouvertes avec l'aide d'un modèle d'IA. **Toutes les informations sont faillibles** : l'outil le rappelle sur chaque écran et recalcule ses chiffres à partir du détail pays par pays.

> **Version 1.3** — 18/11/2026. Un seul fichier, deux profils de connexion (Admin et Standard). Import du document Word tel qu'enregistré par Word sur un poste de la banque. Interface et contenu du document en français, anglais et néerlandais.

## Ce que fait l'outil

| Écran | Contenu |
| --- | --- |
| Carte | Monde coloré par concurrent (une couleur par banque) ou vue d'ensemble ; filtre cash management / trade finance ; sièges et hubs régionaux ; zoom par continent |
| Pays | Recherche dans les trois langues, filtre par continent, barre de présence des 10 concurrents par pays |
| Fiche pays | Présence, date d'implantation et activité (cash management, trade finance) de chaque concurrent, axe du pays, justification ; sanctions et restrictions expliquées comme contexte du pays |
| Concurrents | Fiche par banque : chiffres recalculés, activité, sièges et hubs, couverture par continent dépliable, pays sur place, profil, visuel, sources réglementaires |
| Tableau | Matrice 193 pays × 10 concurrents, filtrable par continent, concurrent, présence, activité et axe du pays |
| Méthode et sources | Avertissement de fiabilité, codes de présence, synthèse du document, gouvernance, 72 sources |
| Connexion | Choix du profil **Standard** ou **Admin** ; chaque profil a son mot de passe et ses données chiffrées |
| Données *(admin)* | Import du document Word (`.docx`, `.docm`, `.dotx`, y compris réenregistré par Word) avec rapport de contrôle ; message et marche à suivre pour un `.doc`, un fichier chiffré, un `.rtf` ou un `.odt` ; import des traductions FR / NL, historique, sauvegarde chiffrée |
| Publication *(admin)* | Publication de l'édition chiffrée dans le dossier réseau de l'équipe |
| Édition *(standard)* | Connexion au dossier de l'équipe ou chargement d'un fichier d'édition |

Partout : **chaque donnée soulignée en pointillé ouvre sa source** (section, ligne et colonne du document, valeur d'origine, sources citées, calcul de l'outil), et **des boutons « Copier »** mettent un résumé prêt à partager dans le presse-papiers (fiche pays, fiche concurrent, un concurrent sur un continent, carte, tableau filtré).

## Principes (identiques à MarCom CRM)

1. **Aucune sortie réseau** : la politique de sécurité (CSP) l'interdit ; carte, polices et données sont dans le fichier.
2. **Aucune donnée en clair** : coffre AES-GCM 256 dans le navigateur, mot de passe personnel, verrouillage après 10 minutes ; l'édition partagée est chiffrée avec la clé d'équipe.
3. **Un seul fichier autonome** pour les deux profils, utilisable hors ligne.

## Structure du dépôt

| Chemin | Contenu |
| --- | --- |
| `src/Competitor_Analysis.html` | **Code source** : l'outil, que l'on modifie |
| `dist/` | Fichier à livrer `Competitor_Analysis.html` et son empreinte `SHA256SUMS.txt` |
| `outils/fabriquer.py` | Contrôle les interdits et prépare `dist/` |
| `outils/carte/` | Construction du fond de carte intégré (Natural Earth, domaine public) |
| `tests/e2e.cjs` | Test de bout en bout des deux profils dans Chromium |
| `tests/variantes_word.py`, `tests/formats_word.cjs` | Variantes Word du document (réenregistré, contrôles de contenu, chiffré, `.doc`, `.rtf`, `.odt`) et test de leur import |
| `docs/` | Dossier technique et journal des versions |

Le document source `.docx` et le paquet de traductions `competitor-analysis-traductions.json` ne sont pas versionnés : ils contiennent les données et sont importés dans l'outil par l'administrateur, qui les y garde chiffrés.

## Fabriquer et tester

```bash
python3 outils/fabriquer.py
```

```bash
node tests/e2e.cjs chemin/vers/Activites_Mondiales_de_Cash_Management.docx captures chemin/vers/competitor-analysis-traductions.json
```

```bash
python3 tests/variantes_word.py chemin/vers/document.docx variantes
```

```bash
node tests/formats_word.cjs variantes chemin/vers/competitor-analysis-traductions.json
```

Les tests demandent Node.js et Playwright avec Chromium ; les variantes Word demandent LibreOffice et le paquet Python `msoffcrypto-tool`.

## Documentation

- [Dossier technique](docs/dossier-technique.md)
- [Journal des versions](docs/journal-des-versions.md)
