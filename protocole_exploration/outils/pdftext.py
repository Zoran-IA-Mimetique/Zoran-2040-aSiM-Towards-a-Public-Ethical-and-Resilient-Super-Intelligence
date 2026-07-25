#!/usr/bin/env python3
"""Extraction du texte des PDF ReportLab de ce depot, stdlib seule.
Usage: python3 pdftext.py <fichier.pdf>
Filtre reel: /ASCII85Decode puis /FlateDecode. Texte en UTF-16BE echappe en octal."""
import sys, re, zlib, base64

def streams(data):
    # (?<!end) evite que 'stream' matche l'interieur de 'endstream'
    for m in re.finditer(rb'(?<!end)stream\r?\n', data):
        s = m.end()
        e = data.find(b'endstream', s)
        if e != -1:
            yield data[s:e].strip()

def unescape(raw):
    out = bytearray(); i = 0
    while i < len(raw):
        c = raw[i]
        if c == 0x5c and i + 1 < len(raw):          # backslash
            nxt = raw[i+1:i+4]
            m = re.match(rb'^([0-7]{1,3})', nxt)
            if m:                                    # echappement octal
                out.append(int(m.group(1), 8) & 0xFF); i += 1 + len(m.group(1))
            else:                                    # \( \) \\ ...
                out.append(raw[i+1]); i += 2
        else:
            out.append(c); i += 1
    return bytes(out)

def extract(path):
    data = open(path, 'rb').read()
    text = b''
    for raw in streams(data):
        try:
            text += zlib.decompress(base64.a85decode(raw, adobe=True))
        except Exception:
            continue
    parts = []
    for g in re.findall(rb'\((?:\\.|[^()\\])*\)', text, re.S):
        b = unescape(g[1:-1])
        parts.append(b.decode('utf-16-be', 'replace') if b'\x00' in b[:4] else b.decode('latin-1'))
    return '\n'.join(p for p in parts if p.strip())

if __name__ == '__main__':
    print(extract(sys.argv[1]))
