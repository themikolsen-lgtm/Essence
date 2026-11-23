#!/bin/sh
# Change le numéro de version de tous les fichiers (oblige les téléphones à recharger le nouveau code).
V=$(date +%Y%m%d%H%M)
sed -i -E "s/\?v=[0-9a-z]+\"/?v=$V\"/g; s/· v[0-9a-z]+</· v$V</" index.html
echo "version $V"
