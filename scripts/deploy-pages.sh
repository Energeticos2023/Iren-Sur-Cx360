#!/usr/bin/env bash
# Publica dist/ en la rama gh-pages (GitHub Pages). Uso: npm run deploy:pages
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npm run build
remote=$(git remote get-url origin)
sha=$(git rev-parse --short HEAD)
tmp=$(mktemp -d)
cp -R dist/. "$tmp"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="CX360 deploy" -c user.email="deploy@cx360.invalid" commit -q -m "Publicar $sha"
git push -f "$remote" gh-pages
rm -rf "$tmp"
echo "Publicado $sha en gh-pages"
