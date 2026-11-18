#!/usr/bin/env python3
"""Fabrique l'édition standard à partir de l'édition admin, et prépare la livraison.

Usage :
    python3 outils/fabriquer_standard.py
        lit   src/Competitor_Analysis_admin.html
        écrit dist/Competitor_Analysis_admin.html
              dist/Competitor_Analysis_standard.html
              dist/SHA256SUMS.txt

On modifie toujours l'édition admin, puis on relance ce script (Python 3, sans dépendance).
"""
import hashlib
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
SRC = RACINE / 'src' / 'Competitor_Analysis_admin.html'
DIST = RACINE / 'dist'
INTERDITS = ['fetch(', 'XMLHttpRequest', 'createObjectURL', 'a.download', 'atob(', 'btoa(']


def verifier(nom, html):
    erreurs = [m for m in INTERDITS if m in html]
    if erreurs:
        sys.exit(f'{nom} : mots interdits présents : {erreurs}')
    if "connect-src 'none'" not in html:
        sys.exit(f'{nom} : la politique de sécurité (CSP) a changé')
    if '/*CARTE-DEBUT*/null/*CARTE-FIN*/' in html:
        sys.exit(f'{nom} : la carte n\'est pas insérée (outils/carte)')


def main():
    admin = SRC.read_text(encoding='utf-8')
    verifier('admin', admin)

    std, n = re.subn(r'/\*ADMIN-DEBUT\*/.*?/\*ADMIN-FIN\*/', '', admin, flags=re.S)
    if n < 3:
        sys.exit(f'Blocs ADMIN attendus : au moins 3, trouvés : {n}')
    std, k = re.subn(r"const EDITION='admin';", "const EDITION='standard';", std, count=1)
    if k != 1:
        sys.exit('Constante EDITION introuvable')
    if 'ADMIN-DEBUT' in std or 'ADMIN-FIN' in std:
        sys.exit('Bloc ADMIN mal fermé')
    verifier('standard', std)

    DIST.mkdir(exist_ok=True)
    sorties = {
        'Competitor_Analysis_admin.html': admin,
        'Competitor_Analysis_standard.html': std,
    }
    lignes = []
    for nom, contenu in sorties.items():
        chemin = DIST / nom
        chemin.write_text(contenu, encoding='utf-8')
        empreinte = hashlib.sha256(chemin.read_bytes()).hexdigest()
        lignes.append(f'{empreinte}  {nom}')
        print(f'{nom:38} {chemin.stat().st_size:>9,} octets  {empreinte[:16]}…')
    (DIST / 'SHA256SUMS.txt').write_text('\n'.join(lignes) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
