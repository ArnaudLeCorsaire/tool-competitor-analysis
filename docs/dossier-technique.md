# Competitor Analysis — dossier technique

*Dernière mise à jour : 18/11/2026 — version 1.1*

## En bref

Competitor Analysis est **un fichier HTML statique par édition** (≈ 370 Ko, sans dépendance) qui fonctionne entièrement dans le navigateur. Il présente l'activité de 10 concurrents de BNP Paribas en cash management et trade finance dans les 193 États membres de l'ONU. Le serveur ne fait que servir le fichier : il ne reçoit, ne stocke et ne voit aucune donnée.

Trois règles portent la conformité de l'outil, comme pour MarCom CRM :

1. **Aucune sortie réseau.** L'outil ne contacte rien (ni API, ni CDN, ni police, ni statistique). La CSP l'interdit et doit le rester. Le fond de carte est intégré au fichier.
2. **Aucune donnée en clair sur le disque, le serveur ou le dossier partagé.** Tout est chiffré avec le mot de passe de l'utilisateur ou la clé d'équipe.
3. **Un seul fichier autonome** par édition : envoyable, utilisable hors ligne, sans fichier annexe.

**Fiabilité des données.** Le document source a été produit en sources ouvertes avec l'aide d'un modèle d'IA. Toutes les informations sont faillibles. L'outil l'affiche en pied de chaque écran et dans « Méthode et sources ».

Navigateurs pris en charge : Microsoft Edge et Google Chrome récents (Chromium). Langues de l'interface : français, anglais, néerlandais. Le contenu du document reste en anglais.

## Architecture

HTML, CSS et JavaScript sont dans un seul fichier, sans framework ni compilation. Le code source est `src/Competitor_Analysis_admin.html`.

| Partie du fichier | Rôle |
| --- | --- |
| `<meta http-equiv="Content-Security-Policy">` | Politique de sécurité, voir ci-dessous |
| Premier bloc `<style>` | Styles ; vert BNP Paribas `#00915A` en accent seulement |
| `#lock` | Écran de mot de passe |
| `#app` | En-tête, onglets, écrans |
| Bloc `<script>` | Textes FR / EN / NL, chiffrement, stockage, lecture du `.docx`, écrans |
| `const MAP=/*CARTE-DEBUT*/…/*CARTE-FIN*/` | Fond de carte projeté (193 pays + territoires hors ONU en gris) |

L'import du document se fait dans le navigateur. Le `.docx` est un zip ; l'outil le décompresse avec l'API native `DecompressionStream('deflate-raw')`, lit `word/document.xml` avec `DOMParser`, puis reconnaît les sections et tableaux par leurs titres. Aucune bibliothèque externe n'est utilisée.

## Sécurité

| Mécanisme | Ce qui est en place | Où dans le code |
| --- | --- | --- |
| CSP | `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'` | balise meta en tête |
| Chiffrement | AES-GCM 256 bits, IV aléatoire à chaque écriture ; clé dérivée par PBKDF2-SHA-256, 310 000 itérations, sel aléatoire stocké avec les données | `deriveKey`, `enc`, `dec`, `saveVault` |
| Mot de passe | 10 caractères minimum, jamais stocké ; un mauvais mot de passe échoue au déchiffrement ; aucune récupération | `showLock` |
| Verrouillage | Après 10 minutes sans activité, la clé et les données sont effacées de la mémoire | `IDLE_MS`, `lockApp` |
| Clé d'équipe | 12 caractères minimum, transmise de vive voix, gardée dans le coffre chiffré de chaque utilisateur | `teamFolder`, `verifyTeam` |

Interdits volontaires, contrôlés par `fabriquer_standard.py` : `fetch(`, `XMLHttpRequest`, `createObjectURL`, `a.download`, `atob(`, `btoa(`. Les enregistrements passent par `showSaveFilePicker`, le base64 par les fonctions maison `toB64` / `fromB64`.

Les liens vers les sources du document s'ouvrent dans un nouvel onglet (`rel="noopener noreferrer"`) : c'est une navigation volontaire de l'utilisateur, pas une requête de l'outil.

`'unsafe-inline'` est nécessaire parce que tout le code est dans le fichier. Le serveur ne doit donc **jamais injecter de script** (bandeau, statistiques, enveloppe SSO).

## Stockage des données

Les données vivent dans l'IndexedDB du navigateur, rattachées à l'origine du site.

| Base IndexedDB | Clé | Contenu |
| --- | --- | --- |
| `ca-tool-admin` | `vault` | Coffre de l'admin `{v, salt, iv, ct}` : données importées, historique des imports, clé d'équipe, dernière publication |
| `ca-tool-admin` | `folder` | Accès au dossier d'équipe (handle du navigateur, sans donnée) |
| `ca-tool-standard` | `vault` | Coffre de l'utilisateur standard : dernière édition chargée, clé d'équipe |
| `ca-tool-standard` | `folder` | Accès au dossier d'équipe |

Le `localStorage` ne garde que la langue et le dernier onglet (`ca:` pour l'admin, `ca-std:` pour le standard).

**Sauvegarde (admin)** : « Sauvegarder » écrit un `.json` contenant le coffre chiffré ; « Restaurer » le relit avec le mot de passe utilisé lors de la sauvegarde.

## Éditions admin et standard, dossier partagé

| Fichier | Pour qui | Contenu |
| --- | --- | --- |
| `Competitor_Analysis_admin.html` | Administrateurs | Tout l'outil, plus Données (import, contrôle, historique, sauvegarde) et Publication |
| `Competitor_Analysis_standard.html` | Utilisateurs autorisés | Consultation : carte, pays, concurrents, tableau, méthode ; onglet Édition. Le code d'import et de publication n'est pas dans le fichier |

L'édition standard est fabriquée par `python3 outils/fabriquer_standard.py` : le script retire les blocs marqués ADMIN (début / fin), remplace `EDITION='admin'` par `'standard'`, contrôle les interdits et écrit `dist/` avec les empreintes SHA-256. On modifie toujours l'édition admin, puis on relance le script.

**Dossier partagé** (aucun serveur ni API ; le navigateur lit et écrit des fichiers chiffrés) :

| Fichier | Écrit par | Contenu |
| --- | --- | --- |
| `ca-equipe.json` | un admin, à la création | Sel et témoin chiffré de la clé d'équipe ; aucune donnée |
| `edition.cae` | les admins (« Publier l'édition pour l'équipe ») | Toutes les données, chiffrées AES-GCM 256 avec la clé d'équipe. En clair : numéro, date, auteur, nombre de pays et de concurrents |

L'édition standard lit le dossier au déverrouillage, au retour sur la fenêtre et toutes les 5 minutes, et charge une édition plus récente si elle existe. À défaut de dossier, l'admin peut **exporter l'édition** dans un fichier `.cae` que l'utilisateur standard charge avec la clé d'équipe.

**Droits NTFS** : administrateurs en Modification ; utilisateurs standard en Lecture seule (ils n'écrivent rien dans le dossier en version 1.0).

## Hébergement sur le serveur intranet

- **HTTPS obligatoire** : `crypto.subtle` et l'accès au dossier partagé n'existent qu'en contexte sécurisé.
- **Une origine dédiée** ; les deux éditions peuvent la partager (bases IndexedDB distinctes).
- **Fichier servi tel quel** : `Content-Type: text/html; charset=utf-8`, sans réécriture ni injection de script.
- En-têtes recommandés : `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-cache`.
- **Accès** : deux adresses protégées par SSO, par exemple `…/competitor-admin` (administrateurs) et `…/competitor` (utilisateurs autorisés).
- **Mises à jour** : remplacer les fichiers ; garder les versions précédentes et leurs empreintes (`dist/SHA256SUMS.txt`).

## Modèle de données et calculs

Le document importé est transformé une fois par `docToData()` ; tous les chiffres affichés sont recalculés par `buildModel()` à chaque ouverture.

**Pays** (`countries`, 193) : `n` (nom ONU du document), `cont` (continent), `cells` (un `{code, era}` par concurrent), `just` (justification avec renvois aux sources).

**Concurrents** (`banks`, 10) : identifiant fixe (`jpm`, `citi`, `hsbc`, `db`, `gs`, `bofa`, `cacib`, `san`, `bbva`, `scb`), nom, entités, division, origine, réseau, performance, positionnement, profil, visuel, sources réglementaires, totaux annoncés (`claim`) et recalculés (`recalc`).

**Codes de présence** et regroupements :

| Code | Libellé | Groupe |
| --- | --- | --- |
| `ON-HQ` | Siège | Sur place |
| `ON-SUB` | Filiale | Sur place |
| `ON-BR` | Succursale / bureau | Sur place |
| `EU-PASS` | Passeport UE | Passeport UE |
| `XB-CLR` | Transfrontalier | Transfrontalier |
| `LIM-COR` | Corridor restreint (contexte pays) | Restreint (pays) |
| `NONE-SANC` | Sanctions internationales | Sanctions internationales |

`LIM-COR` et `NONE-SANC` décrivent **la situation du pays**, pas une décision de la banque. `NONE-SANC` concerne 6 pays (Iran, Corée du Nord, Syrie, Russie, Biélorussie, Cuba), sanctionnés pour les 10 banques. `LIM-COR` couvre, selon la définition du document, des pays fragiles, en conflit ou des micro-États (sanctions partielles, contrôles anti-blanchiment) servis seulement par des canaux multilatéraux ou humanitaires. L'outil l'écrit sur chaque fiche et dans chaque résumé copié.

**Nature de l'activité** (`actOf`), déduite du document :

| Code de présence | Banque avec trade finance | Goldman Sachs |
| --- | --- | --- |
| `ON-HQ`, `ON-SUB`, `ON-BR` | Cash management + trade finance sur place | Cash management sur place |
| `EU-PASS` | Cash management + trade finance via passeport UE | Cash management via passeport UE |
| `XB-CLR` | Cash management + trade finance en transfrontalier (paiements, encaissements, confirmations documentaires) | Cash management en transfrontalier |
| `LIM-COR` | Opérations ponctuelles (canaux multilatéraux ou humanitaires) | idem |
| `NONE-SANC` | Aucune activité (sanctions internationales) | idem |

La capacité de chaque banque vient de son profil : une phrase « does not operate … trade finance » la marque « sans trade finance documentaire » (`bankTFInfo`). Dans le document du 18/11/2026, seule Goldman Sachs est dans ce cas (lettres de crédit et garanties absentes, financement du besoin en fonds de roulement uniquement). La portée vient de la définition du code de présence dans le tableau des codes.

**Axe du pays** (`focusOf`) : classement automatique des mots de la justification du pays (trade, export, commodity, ECA… → trade finance ; clearing, cash, treasury, SEPA, USD… → cash management ; les deux ; non précisé). Les mots retenus sont affichés dans la source de la donnée.

**Filtres** : la carte filtre par activité (cash management, trade finance) ; le tableau filtre par continent, concurrent, présence, activité (cash management, trade finance, cash management sans trade finance) et axe du pays.

**Couleurs des concurrents** (fixes, dans `BANKS_REF`) : JPMorgan brun `#7A4E2D`, Citi bleu `#1E88E5`, HSBC rouge `#D32F2F`, Deutsche Bank marine `#1A237E`, Goldman Sachs or `#C9A227`, Bank of America orange `#EF6C00`, Crédit Agricole CIB sarcelle `#00838F`, Santander framboise `#C2185B`, BBVA violet `#6A1B9A`, Standard Chartered vert vif `#3DB54A` (depuis la version 1.1). Les modes de présence sont des teintes de la couleur du concurrent.

**Sièges et hubs** (`SITES`) : un losange pour le siège, un rond pour chaque hub régional, positionnés sur la carte (villes projetées par `outils/carte`, fichier `lieux.json`). Le pays du siège vient du code `ON-HQ` du document ; la ville et les hubs viennent des profils et de la matrice quand ils les citent (Charlotte, Francfort, Dublin, Hong Kong, Bangkok, Accra…), sinon d'une information publique générale, ce que la source de la donnée précise.

**Source de chaque donnée** (`whyHTML`) : toute donnée soulignée en pointillé s'ouvre sur sa source : section, tableau, ligne et colonne du document, valeur d'origine (en anglais), sources citées par le document avec leur lien, et pour les chiffres et activités, le calcul ou la déduction de l'outil.

**Résumés à copier** (`bankSummary`, `countrySummary`, `mapSummary`, `tableSummary`) : boutons « Copier » sur la fiche pays, la fiche concurrent, chaque continent d'une fiche concurrent, la carte et le tableau filtré. Le résumé est copié en texte et en HTML (collage mis en forme dans Outlook ou Teams), avec la source du document, la date des données et l'avertissement de fiabilité.

**Traduction du contenu du document** : le document est en anglais. Un paquet de traductions FR / NL (`competitor-analysis-traductions.json`, 326 textes) s'importe dans l'onglet Données après le document ; il est rangé chiffré avec les données et publié avec l'édition. La clé de chaque texte est le texte anglais avec ses renvois écrits ⟦n⟧ (`segKey`). Un texte sans traduction s'affiche en anglais avec la marque « EN ». Lors d'un nouvel import, les traductions des textes inchangés sont conservées ; les textes nouveaux ou modifiés demandent un paquet mis à jour.

**Contrôle d'import** (`docToData`) : concurrents reconnus, nombre de pays par continent comparé au nombre annoncé, codes inconnus, pays sans contour sur la carte, renvois vers des sources absentes, écarts entre la synthèse du document et le détail pays par pays.

**Écarts constatés dans le document du 18/11/2026** : la synthèse annonce des totaux différents du détail pour 9 concurrents sur 10 (seul Standard Chartered est cohérent). L'outil affiche toujours les chiffres recalculés et signale l'écart sur chaque fiche.

## Maintenir le code

| Zone | À chercher |
| --- | --- |
| Textes FR / EN / NL | `const L=`, fonction `t()` |
| Concurrents, couleurs, codes | `BANKS_REF`, `MODES`, `MODE_GROUP`, `MODE_TINT` |
| Chiffrement et stockage | `deriveKey`, `enc`, `dec`, `saveVault`, `kvGet`, `kvSet` |
| Lecture du document | `unzip`, `readDocx`, `parsePara`, `docToData` |
| Calcul | `buildModel` |
| Écrans | `viewMap`, `viewCountries`, `openCountry`, `viewBanks`, `viewBank`, `viewTable`, `viewMethod` |
| Admin | `viewData`, `importDocx`, `viewPub`, `teamFolder`, `publish`, `exportEdition` |
| Standard | `viewEdition`, `stdSync`, `applyEdition` |
| Activité, axe du pays, sièges | `actOf`, `bankTFInfo`, `focusOf`, `SITES`, `paintSites` |
| Sources des données, copies | `whyHTML`, `showWhy`, `bankSummary`, `countrySummary`, `copyRich` |
| Traductions du contenu | `segKey`, `segHTML`, `allTrKeys`, `importTr` |

**Précautions**

- Tout texte visible passe par `L.fr`, `L.en` et `L.nl`.
- Ne pas changer les noms des bases IndexedDB, des fichiers d'équipe ni les paramètres de chiffrement : les données existantes deviendraient illisibles.
- Le fond de carte se régénère avec `outils/carte` (`npm ci`, `node construire_carte.mjs`, `python3 inserer_carte.py`), jamais à la main.
- Si un nouveau document change la structure (titres de sections, colonnes), adapter `docToData` et vérifier le rapport de contrôle.

**Tester avant de livrer** : `python3 outils/fabriquer_standard.py` puis `node tests/e2e.cjs <document.docx> [captures] [traductions.json]`. Le test couvre : création du mot de passe, import et rapport, traductions, carte, sièges et hubs, filtres d'activité, sources des données, résumés copiés, fiches, filtres du tableau, trois langues, publication chiffrée, verrouillage, mauvais mot de passe, édition standard, mauvaise clé d'équipe, absence d'erreur JavaScript et de requête réseau.

**Livrer** : publier les deux fichiers de `dist/` avec `SHA256SUMS.txt` et garder la version précédente.

## Points d'attention

- **Données faillibles** : produites avec un modèle d'IA ; certaines sources sont faibles (Wikipedia, sites d'analyse, une offre d'emploi, une source sans adresse). À vérifier avant tout usage externe.
- **Mot de passe perdu = données locales perdues.** L'admin garde une sauvegarde ; l'utilisateur standard recharge simplement l'édition de l'équipe.
- **BNP Paribas** n'est pas dans le jeu de données : ajout prévu dans une version suivante, avec des données internes.
- **Mise à jour du document** : la charte du document prévoit un rafraîchissement en avril et en novembre ; chaque nouvel import crée une version dans l'historique.
- **Nature de l'activité déduite** : le document ne donne pas de colonne « cash management / trade finance » par pays et par banque ; l'outil la déduit de la capacité de la banque et de la définition des codes, et le dit dans la source de chaque donnée. L'axe du pays est un classement automatique de mots-clés.
- **Traductions** : rédigées avec l'aide d'un modèle d'IA à partir du document anglais ; l'original reste consultable dans la source de chaque donnée. Un nouveau document demande un paquet de traductions mis à jour pour les textes modifiés.
- **Autorisation du dossier** : après un rechargement, Edge et Chrome peuvent redemander l'accès au dossier partagé ; un bandeau « Se reconnecter » le fait en un clic.
