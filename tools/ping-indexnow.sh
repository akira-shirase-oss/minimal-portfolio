#!/usr/bin/env bash
# Submit one or more live 404human.dev URLs to IndexNow (Bing, Yandex, etc.).
# Usage: ./tools/ping-indexnow.sh https://404human.dev/posts/my-post/ [...]
set -euo pipefail

KEY="88793c8c28db63d8c932b12a31586101"
HOST="404human.dev"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <url> [url ...]" >&2
  exit 2
fi

for url in "$@"; do
  case "$url" in
    https://404human.dev/*) ;;
    *)
      echo "Refusing non-404human.dev URL: $url" >&2
      exit 2
      ;;
  esac
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    "https://api.indexnow.org/indexnow?url=${url}&key=${KEY}")
  echo "${code} ${url}"
  if [ "$code" != "200" ] && [ "$code" != "202" ]; then
    echo "IndexNow rejected ${url} (HTTP ${code})" >&2
    exit 1
  fi
done
