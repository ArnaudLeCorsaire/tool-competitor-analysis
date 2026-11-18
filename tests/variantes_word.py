#!/usr/bin/env python3
"""Fabrique, à partir du document source, les variantes Word qu'on peut rencontrer sur un poste bancaire.

Usage : python3 tests/variantes_word.py document.docx dossier_sortie
Demande LibreOffice (soffice) et le paquet Python msoffcrypto-tool (pour le fichier chiffré).

Variantes produites :
  original.docx            le document tel quel
  word_sdt.docx            tableaux et sources enveloppés dans des contrôles de contenu (ce que Word ajoute)
  resave.docx              réenregistré par un traitement de texte (LibreOffice)
  protected.docx           chiffré par mot de passe (même conteneur qu'une étiquette de confidentialité qui chiffre)
  original.doc / .rtf / .odt   formats que l'outil ne lit pas et pour lesquels il doit expliquer quoi faire
"""
import pathlib, re, shutil, subprocess, sys, zipfile

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
orig = out / 'original.docx'
shutil.copy(src, orig)

# Contrôles de contenu autour des tableaux pays × concurrents et de la liste des sources
with zipfile.ZipFile(orig) as zin, zipfile.ZipFile(out / 'word_sdt.docx', 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'word/document.xml':
            x = data.decode('utf8')
            starts = [m.start() for m in re.finditer(r'<w:tbl>', x)]
            for i in reversed(range(len(starts))):
                if 3 <= i <= 8:
                    s = starts[i]
                    e = x.index('</w:tbl>', s) + len('</w:tbl>')
                    x = x[:s] + '<w:sdt><w:sdtPr/><w:sdtContent>' + x[s:e] + '</w:sdtContent></w:sdt>' + x[e:]
            k = x.index('Sources des citations')
            ps = x.rfind('<w:p ', 0, k)
            end = x.rfind('<w:sectPr', 0, x.index('</w:body>'))
            x = x[:ps] + '<w:sdt><w:sdtContent>' + x[ps:end] + '</w:sdtContent></w:sdt>' + x[end:]
            data = x.encode('utf8')
        zout.writestr(item, data)

for fmt in ('doc', 'rtf', 'odt'):
    subprocess.run(['soffice', '--headless', '--convert-to', fmt, '--outdir', str(out), str(orig)], check=True, capture_output=True, timeout=600)
tmp = out / 'tmp'
subprocess.run(['soffice', '--headless', '--convert-to', 'docx:MS Word 2007 XML', '--outdir', str(tmp), str(orig)], check=True, capture_output=True, timeout=600)
(tmp / 'original.docx').replace(out / 'resave.docx')
tmp.rmdir()

from msoffcrypto.format.ooxml import OOXMLFile
with open(orig, 'rb') as f, open(out / 'protected.docx', 'wb') as o:
    OOXMLFile(f).encrypt('test', o)
print('Variantes écrites dans', out)
