# Conventions du projet
- Extension Manifest V3 sans compilation : sources chargeables dans `extension/`.
- JavaScript natif avec modules ES, interface en français, thème sombre.
- Permission `storage` uniquement. Aucun serveur, réseau, télémétrie ou blocage réel pour cette étape.
- Stocker les données dans `chrome.storage.local`, jamais dans le stockage synchronisé.
- Démarrer avec zéro liste ; ne jamais charger automatiquement les données d’exemple.
- Utiliser `textContent` pour les données utilisateur ; aucune injection HTML.
- Centraliser la validation dans `extension/parser.js` ; conserver les tests Vitest.
- Exécuter `npm ci` puis `npm test` après modification ; vérifier les parcours Chrome du README.
- Préserver les fichiers utilisateur et ne pas créer de worktree sans demande explicite.
