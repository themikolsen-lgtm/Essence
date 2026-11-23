#!/bin/sh
# Nouvelle version : change le numéro de tous les fichiers, et version.txt (lu par l'app pour se mettre à jour toute seule).
V=$(date +%Y%m%d%H%M)
sed -i -E "s/\?v=[0-9a-z]+\"/?v=$V\"/g; s/· v[0-9a-z]+</· v$V</; s/window.APP_V=\"[^\"]*\"/window.APP_V=\"$V\"/" index.html
printf "%s" "$V" > version.txt
echo "version $V"
