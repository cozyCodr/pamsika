#!/usr/bin/env bash
# Copies keys from a text file into .env.local (without printing them), then checks Gemma and DevDraft.
# Usage: npm run keys [-- /path/to/keys.txt]   (default: ~/Desktop/gemma.txt)
# Key file format: line 1 = Gemini API key; lines "Devdraft_API_Key: ...", "DevDraft_API_Secret: ...", "Turso-key: ..." and a "libsql://..." URL line.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

KEYFILE="${1:-$HOME/Desktop/gemma.txt}"
[ -f "$KEYFILE" ] || { echo "Key file not found: $KEYFILE"; exit 1; }
[ -f .env.local ] || cp .env.example .env.local

val() { grep -i "^$1" "$KEYFILE" | head -1 | sed -E 's/^[^:=]*[:=][[:space:]]*//' | tr -d '[:space:]"'"'" || true; }

GEMINI="$(head -1 "$KEYFILE" | tr -d '[:space:]')"
case "$GEMINI" in *[:=]*) GEMINI="$(val 'gemini\|gemma')";; esac
DD_KEY="$(val 'devdraft_api_key')"
DD_SECRET="$(val 'devdraft_api_secret')"
TURSO_TOKEN="$(val 'turso')"
TURSO_URL="$(grep -i '^libsql://' "$KEYFILE" | head -1 | tr -d '[:space:]' || true)"

python3 -I - "$GEMINI" "$DD_KEY" "$DD_SECRET" "$TURSO_URL" "$TURSO_TOKEN" <<'PY'
import re, secrets, sys
gemini, dd_key, dd_secret, turso_url, turso_token = sys.argv[1:6]
path = ".env.local"
text = open(path).read()
def put(name, value):
    global text
    if not value:
        print(f"  {name}: not found in key file, left as is")
        return
    line = f"{name}={value}"
    if re.search(rf"^{name}=", text, flags=re.M):
        text = re.sub(rf"^{name}=.*$", lambda _: line, text, flags=re.M)
    else:
        text = text.rstrip("\n") + "\n" + line + "\n"
    print(f"  {name}: updated ({len(value)} chars)")
put("GEMINI_API_KEY", gemini)
put("DEVDRAFT_CLIENT_KEY", dd_key)
put("DEVDRAFT_CLIENT_SECRET", dd_secret)
put("TURSO_DATABASE_URL", turso_url)
put("TURSO_AUTH_TOKEN", turso_token)
if not re.search(r"^DEVDRAFT_WEBHOOK_SECRET=.+$", text, flags=re.M):
    put("DEVDRAFT_WEBHOOK_SECRET", secrets.token_hex(32))
open(path, "w").write(text)
PY
unset GEMINI DD_KEY DD_SECRET TURSO_URL TURSO_TOKEN

echo
npx tsx --env-file=.env.local scripts/status.mts
echo
echo "If the app is running, restart it (Ctrl-C, then npm start) so it picks up new keys."
