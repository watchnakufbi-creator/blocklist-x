# BlockList X

Extension Chrome Manifest V3 en français pour gérer des listes personnelles de comptes X. Cette version ne bloque aucun compte et ne communique avec aucun serveur. Permission unique : `storage`.

## Utilisation

Au premier lancement, l’avertissement doit être accepté avec « J’ai compris ». Créez une liste, ajoutez une description et enregistrez-la. Vous pouvez renommer et supprimer les listes, ajouter ou supprimer un compte, rechercher, importer et exporter.

Les fichiers `.txt` et `.csv` (2 Mo maximum) contiennent un pseudo par ligne ou séparé par des virgules, sans en-tête. Les formes `pseudo`, `@pseudo` et `https://x.com/pseudo` sont acceptées, ainsi que les champs simples entre guillemets. Le format CSV complexe avec virgules ou sauts de ligne dans un champ n’est pas pris en charge. Les pseudos sont normalisés en minuscules (1 à 15 lettres ASCII, chiffres ou underscores). Les chemins réservés de X et les autres URL sont refusés. Le résultat indique le nombre d’ajouts, d’entrées invalides et de doublons, y compris ceux déjà présents. L’import enrichit la liste sélectionnée ; il ne la remplace pas.

L’export CSV contient uniquement les pseudos de la liste sélectionnée, sans en-tête. Les descriptions restent dans l’extension. `liste-exemple.csv` contient cinq identifiants de démonstration inventés, sans garantie qu’ils ne correspondent à aucun compte réel. Ce fichier est extérieur au dossier de l’extension et n’est jamais importé automatiquement. L’extension démarre vide.

Les listes et l’acceptation de l’avertissement sont enregistrées uniquement dans `chrome.storage.local`. Elles persistent à la fermeture, ne sont pas synchronisées, et sont supprimées lors de la désinstallation. Les exports sont des fichiers locaux à protéger comme toute donnée personnelle.

## Développement et tests

Node.js 20.19+ ou 22+ et npm. Depuis la racine du dépôt :

```sh
npm ci
npm test
```

Vitest vérifie les formats, les URL interdites, les entrées malveillantes, le nettoyage, les limites et la déduplication. Aucun build n’est nécessaire pour charger l’extension. Les dépendances npm servent uniquement aux tests.

### Vérifications manuelles dans Chrome

- Sur une installation neuve : aucune liste ; impossible de continuer sans cocher l’avertissement.
- Créer deux listes, renommer, enregistrer une description, puis rouvrir le popup pour vérifier la persistance.
- Importer le fichier d’exemple : cinq ajouts. Réimporter : zéro ajout, cinq doublons.
- Importer un fichier contenant `@@invalide` et du HTML : entrées rejetées, aucun HTML exécuté.
- Ajouter un compte, rechercher, le supprimer et vérifier l’export CSV puis sa réimportation.
- Ouvrir « Grande vue » pour la page d’options ; vérifier que les changements sont visibles entre les deux vues. Supprimer une liste après confirmation.
- Aucun compte X ne doit être bloqué et aucune permission d’accès aux sites ne doit être demandée.

## Charger dans Chrome

1. Ouvrez Chrome et saisissez `chrome://extensions` dans la barre d’adresse.
2. Activez **Mode développeur** en haut à droite.
3. Cliquez sur **Charger l’extension non empaquetée**.
4. Sélectionnez le dossier **extension** du dépôt (celui qui contient `manifest.json`), puis validez.
5. Dans le menu des extensions de Chrome, ouvrez **BlockList X** et cochez **J’ai compris**, puis **Continuer**.
6. Pour les options, cliquez sur **Grande vue** dans le popup. Après une modification du code, cliquez sur **Actualiser** dans `chrome://extensions`, puis rouvrez le popup et la page d’options.
