# BlockList X

Extension Chrome Manifest V3, en français, sans compilation. Gérez des listes locales et bloquez leurs comptes en pilotant l’interface visible de X, uniquement après confirmation. Aucun serveur, aucune télémétrie, aucune clé API, aucun endpoint interne. Les listes, réglages, résultats et compteur quotidien restent dans `chrome.storage.local`. X reçoit naturellement les visites de profils et les actions effectuées via son site ; aucune liste n’est transmise à un autre service.

**Attention :** vous êtes responsable de vos listes. X peut limiter ou suspendre votre compte même avec des délais prudents. Cette extension ne garantit ni la compatibilité avec l’interface de X ni l’absence de limitations. Vérifiez la liste, le compte connecté et utilisez d’abord un compte secondaire. Arrêter ne débloque pas les comptes déjà bloqués et ne peut pas annuler une confirmation déjà envoyée à X.

## Permissions

- `storage` : conserver listes, avertissement accepté, réglages, file et compteur journalier localement.
- Hôtes `https://x.com/*` et `https://twitter.com/*` : charger le content script, lire les contrôles visibles et cliquer les actions de blocage dans l’onglet choisi ; vérifier également l’URL de cet onglet. Pas d’accès à d’autres sites.
- Aucune permission `tabs`, `scripting`, `cookies`, `downloads` ou `activeTab`. Les API d’onglets utilisées ne nécessitent pas `tabs` pour ces opérations ; les URL de X sont accessibles grâce aux permissions hôtes. Le script statique rend inutile une injection dynamique.

## Gestion des listes

Au premier lancement, cochez « J’ai compris ». L’extension démarre sans liste. Créez une liste, ajoutez une description, enregistrez, renommez ou supprimez-la. Recherche, ajout et suppression de comptes sont disponibles dans le popup et la page d’options (« Grande vue »).

Import `.txt` ou `.csv` (2 Mo maximum), sans en-tête : un pseudo par ligne ou séparé par des virgules. Formes `pseudo`, `@pseudo`, `https://x.com/pseudo`, champs simples entre guillemets acceptés. Les CSV complexes avec virgules ou sauts de ligne dans les champs ne sont pas pris en charge. Les pseudos sont normalisés en minuscules, limités à 1–15 lettres ASCII, chiffres ou underscores. Les chemins réservés sont rejetés. L’import enrichit la liste ; son bilan distingue ajouts, invalides et doublons, y compris les comptes déjà présents.

L’export contient uniquement les pseudos, sans en-tête ni description. `liste-exemple.csv`, extérieur à l’extension, contient cinq pseudos inventés qui pourraient néanmoins correspondre à de vrais comptes. **Ne l’utilisez pas pour un test de blocage réel.** Il n’est jamais chargé automatiquement. La désinstallation efface le stockage local ; exportez vos listes si nécessaire.

## Blocage contrôlé

1. Ouvrez `https://x.com` dans l’onglet actif et connectez-vous au compte secondaire souhaité. Vérifiez son identité ; l’extension ne lit pas vos cookies.
2. Dans le popup, sélectionnez une liste et les réglages, puis « Bloquer cette liste ».
3. Vérifiez le nom, le nombre, la durée indicative et l’avertissement. Cochez la confirmation puis « Commencer les blocages ».
4. Le même onglet ouvre chaque profil, vérifie son pseudo, ouvre « … », choisit « Bloquer » et confirme. Un profil protégé utilise ce même menu, sans lire ses publications. Les comptes déjà bloqués sont passés ; les comptes inexistants/suspendus sont notés « introuvable ». Un contrôle absent ou un résultat non confirmé donne « erreur ».
5. Gardez cet onglet ouvert sans le manipuler ni changer de session. L’encart sur X et le popup proposent Pause, Reprendre et Arrêter ; les résultats sont consultables dans l’extension. Fermer le popup ne termine pas la file.

Le délai aléatoire entre comptes est de 8 à 20 secondes par défaut, configurable entre 8 et 3600 secondes. Les temps de chargement s’ajoutent. Le plafond par défaut est de 100 **tentatives** par jour, configurable entre 1 et 1000, partagé entre listes et persistant. Par prudence, une tentative est comptée avant la confirmation finale, même si celle-ci échoue ensuite ; les comptes déjà bloqués ou introuvables ne consomment pas de tentative. La date locale du navigateur détermine le jour ; le compteur est remis à zéro lors de la première opération du nouveau jour. Ce compteur n’inclut pas les blocages effectués en dehors de l’extension, et disparaît à la désinstallation.

Une limite, un captcha, une vérification ou trois erreurs consécutives mettent la file en pause avec un message. **Aucune résolution ni reprise automatique.** Au plafond, attendez un autre jour avant de reprendre ; n’augmentez pas le plafond pour contourner une limitation. La pause conserve la position et le délai. Si la page est rechargée au milieu d’une confirmation, le résultat devient incertain : la file se met en pause et ce compte est passé à la reprise, avec le résultat « erreur ». Vérifiez-le manuellement. Une file arrêtée est définitive ; vous pouvez démarrer une nouvelle file avec une nouvelle confirmation. Une seule file est autorisée à la fois.

## Limites connues

- Sélecteurs et libellés X centralisés dans `extension/selectors.js`. Reconnaissance des contrôles en français et anglais seulement. Une évolution de X peut provoquer des erreurs : inspectez et actualisez ces sélecteurs, sans remplacer un contrôle absent par un bouton générique.
- Détection de limites basée sur URL, contrôles et messages visibles, pas sur le réseau interne. Elle n’est pas exhaustive. Les textes du profil peuvent aussi provoquer un arrêt prudent par faux positif.
- Vérification d’identité du profil avant clic ; ne naviguez pas manuellement pendant une file. Pas de prise en charge garantie de changements de compte connecté, de redirections inhabituelles ou d’une autre extension modifiant X.
- Arrêt local synchrone dans l’encart ; les attentes et vérifications de sécurité sont interrogées toutes les 100 ms et avant chaque clic. La cible est moins d’une seconde dans un onglet actif. Chrome peut suspendre ou ralentir les onglets : ce délai ne peut pas être garanti lorsque le navigateur est gelé. Une action déjà transmise à X reste irréversible par ce bouton.
- La file et ses résultats survivent aux rechargements. La fermeture de l’onglet ou le redémarrage du navigateur nécessitent d’arrêter l’ancienne file dans l’extension puis d’en confirmer une nouvelle dans un onglet X. Il n’y a pas de transfert automatique de file entre onglets.
- Pas de validation réelle sur une session X connectée pendant le développement : les parcours DOM restent à vérifier avec votre compte secondaire. Les tests unitaires ne prouvent pas la compatibilité de X aujourd’hui.

## Développement

Node.js 20.19+ ou 22+, npm. Aucun build requis.

```sh
npm ci
npm test
```

`parser.js` valide les entrées ; `queue.js` porte les règles pures ; `background.js` sérialise les commandes et le stockage ; `content.js` pilote X ; `selectors.js` regroupe tous ses sélecteurs ; `block-ui.js` gère confirmation et suivi. Vitest vérifie nettoyage/déduplication, limites de configuration, délais, plafond inter-files et changement de jour, pause/reprise sérialisée, résultats incertains et arrêt sur trois erreurs.

## Charger ou recharger dans Chrome

1. Ouvrez `chrome://extensions` et activez **Mode développeur**.
2. Première installation : **Charger l’extension non empaquetée**, puis sélectionnez le dossier `extension` contenant `manifest.json`.
3. Mise à jour : sur la carte **BlockList X**, cliquez sur **Actualiser** (flèche circulaire). Acceptez les nouvelles autorisations d’accès à X si Chrome le demande.
4. Fermez les anciens popup/pages d’options et **rechargez aussi l’onglet X** pour remplacer son content script.

## Scénario manuel avec un compte secondaire et cinq comptes

1. Connectez un compte secondaire à X. Créez une liste avec **cinq comptes que vous contrôlez ou dont les propriétaires consentent au test**. N’utilisez pas les pseudos fictifs livrés pour déclencher des blocages.
2. Vérifiez création, renommage, description, export/réimport, dédoublonnage et persistance après fermeture. Vous pouvez inclure un profil protégé parmi les comptes de test et en bloquer déjà un manuellement pour vérifier « déjà bloqué ».
3. Réglez le plafond à **2**, gardez les délais **8–20 s**. « Bloquer cette liste » doit afficher les cinq comptes et ne rien faire sans cocher la confirmation.
4. Démarrez, vérifiez la session, puis cliquez **Pause** pendant une attente. Aucun nouveau clic ne doit se produire. **Reprendre** doit conserver la progression. Vérifiez sur X les résultats indiqués.
5. Après deux tentatives, vérifiez l’arrêt au plafond. Fermez et rouvrez le popup : compteur et position doivent persister. Testez **Arrêter** ; la file ne doit plus repartir avec Reprendre.
6. Pour terminer les cinq comptes, attendez un autre jour puis démarrez une nouvelle file explicitement. Les comptes déjà bloqués doivent être passés. Testez **Arrêter pendant un délai** depuis l’encart X : l’état doit changer immédiatement et aucun nouveau blocage ne doit partir. N’essayez pas de déclencher volontairement un captcha ou une limitation.
7. Vérifiez manuellement les cinq profils et le journal. Un échec DOM doit être signalé, jamais annoncé comme un blocage réussi. Pour tester trois erreurs sans risque réel, utilisez les tests Vitest ; ne modifiez pas les sélecteurs sur une session de production.
