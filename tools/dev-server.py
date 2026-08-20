#!/usr/bin/env python3
"""Servidor local do jogo + ponte de escrita do Editor.

Uso:  python3 tools/dev-server.py [porta]
Abra http://localhost:8000 (ou o IP da rede, no celular).

Ele serve a pasta do jogo e aceita PUT em data/editor-overrides.json,
gravando o arquivo no disco. E isso que faz o botao SALVAR do Editor
salvar DIRETO na pasta do jogo.
"""
import http.server
import json
import os
import shutil
import socket
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALVO = os.path.join('data', 'editor-overrides.json')
LIMITE = 8 * 1024 * 1024

class H(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 = conexao reaproveitada. Em HTTP/1.0 cada .glb abria e
    # fechava socket, e o navegador (que abre poucas conexoes por vez)
    # deixava o pedido da ponte esperando na fila.
    protocol_version = 'HTTP/1.1'
    def __init__(s, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def j(s, c, d):
        b = json.dumps(d).encode('utf-8')
        s.send_response(c)
        s.send_header('Content-Type', 'application/json')
        s.send_header('Content-Length', str(len(b)))
        s.send_header('Cache-Control', 'no-store')
        s.end_headers()
        s.wfile.write(b)
    def do_GET(s):
        if s.path.split('?')[0].strip('/') == '__editor-bridge':
            s.j(200, {'bridge': 'psx-editor', 'write': True})
            return
        super().do_GET()
    def do_PUT(s):
        if s.path.split('?')[0].lstrip('/') != 'data/editor-overrides.json':
            s.j(403, {'erro': 'proibido'})
            return
        n = int(s.headers.get('Content-Length') or 0)
        if n <= 0 or n > LIMITE:
            s.j(400, {'erro': 'tamanho'})
            return
        b = s.rfile.read(n)
        try:
            json.loads(b.decode('utf-8'))
        except Exception:
            s.j(400, {'erro': 'json invalido'})
            return
        d = os.path.join(ROOT, ALVO)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        if os.path.exists(d):
            shutil.copyfile(d, d + '.bak')
        with open(d, 'wb') as f:
            f.write(b)
        print('[editor] gravado ' + ALVO)
        s.j(200, {'ok': True})
    do_POST = do_PUT

porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
H.extensions_map['.glb'] = 'model/gltf-binary'
print('Pasta: ' + ROOT)
print('Abra http://localhost:' + str(porta))
http.server.ThreadingHTTPServer(('0.0.0.0', porta), H).serve_forever()
