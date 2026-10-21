import sys, json
m, c, f = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    d = json.load(open(f)); e = d.get('error')
    print('diag:', m, c, (e.get('status', '') + ': ' + e.get('message', '')[:260]) if e else 'resposta: ' + d['candidates'][0]['content']['parts'][0]['text'][:30])
except Exception as x:
    print('diag:', m, c, '?', open(f).read()[:200])
