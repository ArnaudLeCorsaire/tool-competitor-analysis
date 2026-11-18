#!/usr/bin/env python3
"""Contrôle l'outil et prépare la livraison (un seul fichier, profils Admin et Standard).

Usage :
    python3 outils/fabriquer.py
        lit   src/Competitor_Analysis.html
        écrit dist/Competitor_Analysis.html et dist/SHA256SUMS.txt

Python 3, sans dépendance. On modifie toujours src/, puis on relance ce script.
"""
import hashlib
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
SRC = RACINE / 'src' / 'Competitor_Analysis.html'
DIST = RACINE / 'dist'
NOM = 'Competitor_Analysis.html'
INTERDITS = ['fetch(', 'XMLHttpRequest', 'createObjectURL', 'a.download', 'atob(', 'btoa(']


def main():
    html = SRC.read_text(encoding='utf-8')
    erreurs = [m for m in INTERDITS if m in html]
    if erreurs:
        sys.exit(f'Mots interdits présents : {erreurs}')
    if "connect-src 'none'" not in html:
        sys.exit('La politique de sécurité (CSP) a changé')
    if '/*CARTE-DEBUT*/null/*CARTE-FIN*/' in html:
        sys.exit("La carte n'est pas insérée (outils/carte)")
    DIST.mkdir(exist_ok=True)
    for ancien in DIST.glob('Competitor_Analysis_*.html'):
        ancien.unlink()
    sortie = DIST / NOM
    sortie.write_text(html, encoding='utf-8')
    empreinte = hashlib.sha256(sortie.read_bytes()).hexdigest()
    (DIST / 'SHA256SUMS.txt').write_text(f'{empreinte}  {NOM}\n', encoding='utf-8')
    print(f'{NOM}  {sortie.stat().st_size:,} octets  {empreinte[:16]}…')


if __name__ == '__main__':
    main()
