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

## Carnet de consommation

L'onglet **Carnet** sert de cahier de suivi : on y note chaque plein (date, compteur, litres, prix, plein complet ou non). Il calcule la consommation réelle entre deux pleins complets, les dépenses par mois, le prix moyen du litre et le coût pour 100 km, et peut réutiliser la consommation réelle dans la recherche. Le bouton « Noter ce plein » préremplit le plein depuis la station trouvée. Les données restent sur l'appareil (export / import CSV pour les sauvegarder).

## Comptes (Firebase)

Bouton 👤 en haut : connexion par e-mail / mot de passe ou Google, puis synchronisation automatique des réglages et du carnet entre appareils (Firestore, document `users/{uid}`). Désactivé tant que `firebase-config.js` vaut `null`. Règles de sécurité à coller dans Firestore : `firestore.rules`.

## Voiture électrique

Si la voiture choisie est électrique, l'app cherche les **bornes de recharge** compatibles autour de vous, calcule le **temps de charge** (batterie, puissance de la borne et de la voiture, ralentissement au-delà de 80 %), affiche le prix quand l'opérateur le publie, et liste **ce qu'il y a à faire à côté** pendant la charge (cafés, restaurants, boulangeries, supermarchés, parcs, toilettes…).

Les bornes viennent de la base nationale IRVE (data.gouv.fr), préparée chaque lundi par la tâche `irve.yml` dans `irve/`.

## Sources de données (gratuites, sans clé)

- Prix : [prix-carburants.gouv.fr](https://www.prix-carburants.gouv.fr/) via l'API data.economie.gouv.fr (flux instantané)
- Adresses : [api-adresse.data.gouv.fr](https://adresse.data.gouv.fr/)
- Distances routières : [OSRM](https://project-osrm.org/) (repli : vol d'oiseau × 1,3)
- Enseignes (Total, Leclerc…) : OpenStreetMap via Overpass
- Carte : OpenStreetMap / Leaflet

## Utilisation

C'est un simple fichier `index.html`. Pour l'avoir en ligne sur téléphone : **Settings → Pages → Deploy from a branch → `main` / root**, puis ouvrez `https://themikolsen-lgtm.github.io/Essence/`.
La géolocalisation nécessite une page en HTTPS (GitHub Pages convient).
