#!/usr/bin/env python3
"""Intègre les traductions FR / NL du contenu du document dans l'outil, chiffrées.

Usage :
    python3 outils/traductions/integrer_traductions.py competitor-analysis-traductions.json [src/Competitor_Analysis.html]

Chaque entrée du paquet est :
  - repérée par les 16 premiers octets de SHA-256("ca-tr-id|" + texte anglais normalisé) ;
  - chiffrée en AES-GCM 256 avec la clé SHA-256("ca-tr-key|" + texte anglais normalisé).
Le fichier HTML ne contient donc aucune traduction lisible : seul quelqu'un qui possède déjà le texte anglais
du document peut retrouver la traduction correspondante. L'outil les applique seul à l'import du document.

La normalisation doit rester identique à trNorm() dans l'outil : renvois ⟦n⟧ retirés, NFKC, apostrophes,
guillemets et tirets unifiés, espaces regroupés, minuscules.
Dépendance : le paquet Python « cryptography » (outil de préparation, non livré).
"""
import base64, hashlib, json, os, pathlib, re, sys, unicodedata
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent


def norm(k):
    s = re.sub(r'⟦[\d,]+⟧', ' ', k)
    s = unicodedata.normalize('NFKC', s)
    s = re.sub('[‘’‚‛′`´]', "'", s)
    s = re.sub('[“”„«»″]', '"', s)
    s = re.sub('[‐-―−]', '-', s)
    s = re.sub(r'[\s﻿]+', ' ', s).strip()
    return s.lower()


def main():
    pack = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
    cible = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RACINE / 'src' / 'Competitor_Analysis.html'
    if pack.get('kind') != 'ca-traductions':
        sys.exit('Paquet de traductions invalide')
    entrees = {}
    for k, v in pack['t'].items():
        n = norm(k)
        if not n or not (v.get('fr') or v.get('nl')):
            continue
        ident = hashlib.sha256(('ca-tr-id|' + n).encode()).digest()[:16].hex()
        cle = hashlib.sha256(('ca-tr-key|' + n).encode()).digest()
        iv = os.urandom(12)
        ct = AESGCM(cle).encrypt(iv, json.dumps({'fr': v.get('fr', ''), 'nl': v.get('nl', '')}, ensure_ascii=False).encode(), None)
        entrees[ident] = [base64.b64encode(iv).decode(), base64.b64encode(ct).decode()]
    bloc = json.dumps({'v': 1, 'n': len(entrees), 'date': pack.get('date', ''), 'e': entrees}, separators=(',', ':'))
    html = cible.read_text(encoding='utf-8')
    nouveau, n = re.subn(r'/\*TRAD-DEBUT\*/.*?/\*TRAD-FIN\*/', lambda m: '/*TRAD-DEBUT*/' + bloc + '/*TRAD-FIN*/', html, count=1, flags=re.S)
    if n != 1:
        sys.exit('Marqueurs TRAD introuvables')
    cible.write_text(nouveau, encoding='utf-8')
    print(f'{len(entrees)} traductions chiffrées intégrées dans {cible.name} ({len(bloc):,} octets)')


if __name__ == '__main__':
    main()
