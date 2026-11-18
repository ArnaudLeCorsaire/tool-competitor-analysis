#!/usr/bin/env python3
"""Insère carte.json dans l'édition admin, entre /*CARTE-DEBUT*/ et /*CARTE-FIN*/.
Usage : python3 inserer_carte.py [../../src/Competitor_Analysis.html]"""
import json, re, sys, pathlib
ici = pathlib.Path(__file__).parent
cible = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ici / '../../src/Competitor_Analysis.html'
carte = json.loads((ici / 'carte.json').read_text(encoding='utf-8'))
html = cible.read_text(encoding='utf-8')
nouveau, n = re.subn(r'/\*CARTE-DEBUT\*/.*?/\*CARTE-FIN\*/',
                     lambda m: '/*CARTE-DEBUT*/' + json.dumps(carte, separators=(',', ':'), ensure_ascii=False) + '/*CARTE-FIN*/',
                     html, count=1, flags=re.S)
if n != 1:
    sys.exit('Marqueurs CARTE introuvables')
cible.write_text(nouveau, encoding='utf-8')
print(f'Carte insérée : {len(carte["c"])} pays, {cible} ({cible.stat().st_size:,} octets)')
