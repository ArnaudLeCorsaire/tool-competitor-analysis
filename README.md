# Competitor Analysis Tool

Outil interne d'analyse de la concurrence, destiné à être utilisé sur le système interne de la banque.
Il suit les mêmes principes que MarCom CRM : un fichier HTML autonome, sans dépendance externe, qui s'ouvre dans le navigateur.

> **Statut :** initialisation. Le cahier des charges reste à intégrer.

## Structure du dépôt

| Chemin | Contenu |
| --- | --- |
| `src/` | Code source de l'outil (fichier(s) HTML livrés) |
| `docs/dossier-technique.md` | Dossier technique : architecture, sécurité, stockage, hébergement, modèle de données, maintenance |
| `docs/journal-des-versions.md` | Journal des versions, le plus récent en premier |

## Principes

- **Fichier unique et autonome** : HTML, CSS et JavaScript dans le même fichier, sans CDN, sans appel réseau.
- **Données locales** : rien ne quitte le poste de l'utilisateur, sauf export explicite.
- **Compatible avec l'environnement de la banque** : navigateur d'entreprise, politique de sécurité (CSP) stricte, pas d'installation.

## Utilisation

À compléter une fois la première version livrée.

## Documentation

La documentation est tenue à jour à chaque version :
- [Dossier technique](docs/dossier-technique.md)
- [Journal des versions](docs/journal-des-versions.md)
