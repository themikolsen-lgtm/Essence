# Essence

Application web qui trouve **la station la plus rentable** autour de vous, en tenant compte non seulement du prix au litre mais aussi du carburant consommé pour aller à la station.

## Fonctionnement

1. Tapez votre voiture (ex. « clio 4 1.5 dci 2016 ») : l'app affiche le véhicule trouvé et sa consommation (base intégrée dans `cars.js`, modifiable).
   Choisissez « Faire le plein » (réservoir + jauge) ou saisissez les litres.
2. Indiquez votre adresse ou utilisez votre position GPS.
3. L'application récupère les prix en temps réel des stations dans le rayon choisi et calcule pour chacune :

   **coût total = litres à mettre × prix/L + (distance du trajet × consommation / 100) × prix/L**

   Le trajet est compté en aller-retour par défaut (option désactivable).

Les stations sont classées de la plus rentable à la moins rentable, avec une carte et un lien d'itinéraire.

## Sources de données (gratuites, sans clé)

- Prix : [prix-carburants.gouv.fr](https://www.prix-carburants.gouv.fr/) via l'API data.economie.gouv.fr (flux instantané)
- Adresses : [api-adresse.data.gouv.fr](https://adresse.data.gouv.fr/)
- Distances routières : [OSRM](https://project-osrm.org/) (repli : vol d'oiseau × 1,3)
- Enseignes (Total, Leclerc…) : OpenStreetMap via Overpass
- Carte : OpenStreetMap / Leaflet

## Utilisation

C'est un simple fichier `index.html`. Pour l'avoir en ligne sur téléphone : **Settings → Pages → Deploy from a branch → `main` / root**, puis ouvrez `https://themikolsen-lgtm.github.io/Essence/`.
La géolocalisation nécessite une page en HTTPS (GitHub Pages convient).
