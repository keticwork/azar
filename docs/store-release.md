# Azar - checklist distribution stores

Derniere mise a jour : 7 juillet 2026.

Ce document sert de base pour publier Azar sur Google Play et Apple App Store. Il doit rester aligne avec le comportement reel de l'app.

## Etat actuel

- App Expo SDK 54.
- Depot GitHub : https://github.com/keticwork/azar
- Projet EAS : `@ketic/azar`
- EAS projectId : `65471fa7-981b-407b-a22d-a0b1a0b76406`
- Identifiants natifs :
  - iOS : `com.keticwork.azar`
  - Android : `com.keticwork.azar`
- Privacy policy publique : https://keticwork.github.io/azar/privacy-policy.html
- Assistance publique : https://keticwork.github.io/azar/support.html
- Kit textes/images stores : `store-kit/`
- Aucun compte utilisateur.
- Aucune publicite.
- Aucun analytics.
- Aucun achat integre.
- Aucune donnee envoyee a un serveur.
- Galerie utilisee uniquement pour choisir une image locale de piece.

## Etape 1 - Connexion Expo/EAS

Sur cette machine, la connexion EAS a ete validee avec le compte Expo `ketic` / `keticwork@gmail.com`.

```sh
npm run eas:login
npm run eas:whoami
```

Quand `whoami` affiche le nom du compte Expo, continuer. Si le terminal repond deja `ketic`, ne pas recreer de compte.

## Etape 2 - Lier le projet EAS

Azar est deja lie au projet EAS `@ketic/azar`.

```sh
npm run eas:configure
```

Pour une nouvelle app, cette commande peut ajouter un `extra.eas.projectId` dans `app.json`. Si c'est le cas :

```sh
git status -sb
git add app.json
git commit -m "chore: link Azar to EAS"
git push
```

## Etape 3 - Build preview Android

Premier build a faire, car il ne demande pas de compte Apple ni d'UDID iPhone.

```sh
npm run build:preview:android
```

Resultat attendu : EAS fournit une URL pour telecharger un APK installable sur Android.

Ce lien est un artefact de test interne. Il expire apres quelques jours et ne doit pas etre utilise comme lien public sur un site web. Le lien public durable viendra de Google Play apres publication.

Validation Azar du 7 juillet 2026 : le lien direct APK a permis de telecharger, installer et ouvrir l'app sur Android. L'avertissement Android indiquant que le developpeur est inconnu est normal pour un APK installe hors Google Play. En preview, utiliser `Installer quand meme` uniquement sur nos propres builds EAS.

Si EAS demande :

```txt
Generate a new Android Keystore?
```

Repondre `yes` pour le premier build Android de l'app. Garder ensuite les credentials Android distants geres par Expo. Ne pas regenerer un nouveau keystore pour une app deja publiee, car Google Play attend la meme cle de signature pour les mises a jour.

A verifier sur telephone Android :

- l'app s'installe hors Expo Go ;
- lancer pile ou face fonctionne ;
- personnalisation des libelles fonctionne ;
- choix d'image fonctionne ;
- les images restent apres fermeture/reouverture ;
- bouton `Defaut` retire les images et remet les libelles ;
- volet confidentialite lisible ;
- pas de crash.

Si la page Expo reste bloquee sur l'installation :

- ouvrir le fichier APK depuis l'application `Telechargements`, `Files` ou `Mes fichiers` du telephone ;
- autoriser temporairement l'installation depuis Chrome/le navigateur si Android le demande ;
- verifier si `Azar` est deja present dans la liste des applications ;
- desinstaller l'ancienne version d'Azar si elle existe, puis relancer l'installation ;
- retelecharger l'APK si le fichier semble incomplet ;
- redemarrer le telephone si l'installateur Android reste bloque.

## Etape 4 - Build preview iOS

Pour installer directement sur un iPhone hors TestFlight, il faut enregistrer l'appareil chez Apple via EAS.

```sh
npx eas-cli device:create
npm run build:preview:ios
```

Validation Azar du 7 juillet 2026 :

- Apple Developer Program actif sur le compte Apple `kiapcn@icloud.com`.
- Team Apple utilisee : `kevin pichon (X7667K9QA6)`.
- Provider Apple : `kevin pichon (128819479)`.
- Appareil enregistre via `npx eas-cli device:create` :
  - `00008030-00045091026B802E (iPhone 11)`
- Bundle identifier `com.keticwork.azar` enregistre avec succes.
- Apple Distribution Certificate cree/gere par EAS.
- Provisioning profile ad hoc cree pour l'iPhone 11.
- Build iOS preview termine avec succes :
  - URL : https://expo.dev/accounts/ketic/projects/azar/builds/7e9bcb36-c5f1-491f-80c9-cfcce970c82d
  - Commit : `dd1cff3`
  - Profil : `preview`
- Installation et ouverture validees sur iPhone 11 apres activation du Mode developpeur iOS.

Reponses donnees pendant le flow iOS :

- `Would you like to use the ketic account?` : `yes`
- Apple ID : compte Apple Developer du titulaire.
- Methode d'enregistrement appareil : `Website - generates a registration URL to be opened on your devices`
- Installer le profil iOS propose par Expo sur l'iPhone.
- Si EAS demande de selectionner l'appareil ad hoc : selectionner l'iPhone voulu avec `Space`, puis `Return`.
- `Do you want to log in to your Apple account?` : `yes`
- `Generate a new Apple Distribution Certificate?` : `yes` au premier build iOS de l'app.
- Laisser EAS gerer les credentials iOS distants.

Points Apple regles pendant cette etape :

- Le nouveau contrat Apple Developer Program a ete accepte dans Apple Developer.
- Le contrat gratuit App Store Connect est actif.
- Le statut DSA / trader UE a ete renseigne comme professionnel/commercant pour l'activite auto-entrepreneur.
- Un justificatif d'entreprise officiel a ete envoye a Apple ; au moment de cette note, la conformite DSA apparait `En cours de verification`.
- Le contrat payant / achats integres est ignore pour Azar V1, car l'app est gratuite et sans IAP.

Notes importantes :

- Un build iOS preview ad hoc ne s'installe que sur les appareils enregistres dans le provisioning profile.
- Si on ajoute un autre iPhone, il faut l'enregistrer puis refaire un build iOS preview.
- Sur iPhone, iOS peut demander d'activer `Reglages > Confidentialite et securite > Mode developpeur`. C'est normal pour un build interne hors App Store/TestFlight.
- Le Mode developpeur n'est pas necessaire pour les futurs utilisateurs via App Store ou TestFlight.
- Le lien EAS est un artefact interne temporaire, pas un lien public de distribution.

Alternative plus proche de la vraie distribution : creer l'app dans App Store Connect, faire un build iOS production, puis l'envoyer vers TestFlight.

## Etape 5 - Build production Android

```sh
npm run build:android
```

Resultat attendu : fichier AAB pour Google Play.

Note importante : pour une premiere soumission Google Play, Expo indique qu'il faut souvent uploader l'app manuellement une premiere fois dans Play Console avant que les soumissions API via EAS Submit fonctionnent.

## Etape 6 - Build production iOS

Prerequis :

- Apple Developer Program actif.
- App creee dans App Store Connect.
- Bundle ID `com.keticwork.azar`.
- App privacy remplie.
- Age rating rempli.
- Screenshots ajoutes.
- Conformite DSA validee ou au moins non bloquante dans App Store Connect.

Puis :

```sh
npm run build:ios
npm run submit:ios
```

EAS Submit envoie le build vers App Store Connect/TestFlight. Il faut ensuite terminer la fiche dans App Store Connect et envoyer a App Review.

Si le code ou les visuels changent pendant qu'un build est en preparation, annuler le build avec `Ctrl+C`, verifier le projet, commit/push, puis relancer `npm run build:ios`. Ne pas envoyer a Apple une build que l'on sait deja depassee.

Reponses conseillees pendant les credentials iOS de production :

- `Reuse this distribution certificate?` : `yes`, si le certificat est deja lie a `@ketic/azar`.
- `Generate a new Apple Provisioning Profile?` : `yes`, si EAS n'a pas encore de profil App Store valide pour `com.keticwork.azar`.
- Laisser EAS gerer les credentials distants.

Dans App Store Connect, pour la V1 :

- `Connexion requise` : non, decocher la case.
- `URL de l'assistance` : `https://keticwork.github.io/azar/support.html`
- `URL marketing` : laisser vide.
- `UGS / SKU` : `com.keticwork.azar`
- Captures iPhone : utiliser de preference des captures reelles de l'app ; des visuels de secours sont disponibles dans `store-kit/images/apple-app-store/`.

## Journal questions/reponses rencontrees

Cette section garde les prompts reels vus pendant la distribution Azar. Elle servira a produire ensuite un guide general plus digeste pour les prochaines mini-apps.

### Expo/EAS

Question :

```txt
EAS project not configured. Would you like to automatically create an EAS project?
```

Reponse : `yes` pour la premiere configuration EAS d'une nouvelle app.

Pourquoi : cela cree le projet Expo/EAS et ajoute `extra.eas.projectId` dans `app.json`. Committer ensuite `app.json`.

Question :

```txt
Using remote Android credentials (Expo server)
Generate a new Android Keystore?
```

Reponse : `yes` uniquement au premier build Android de l'app.

Pourquoi : Google Play exigera ensuite la meme cle pour les mises a jour. Ne pas regenerer de keystore apres publication.

Question :

```txt
The package @expo/ngrok is required to use tunnels, would you like to install it globally?
```

Reponse : `yes` si Expo Go ne marche pas en LAN et que le mode tunnel est necessaire.

Pourquoi : le tunnel contourne les problemes Wi-Fi/box/firewall. Il sert au developpement, pas a la distribution store.

### iOS preview/ad hoc

Question :

```txt
You're inside the project directory. Would you like to use the ketic account?
```

Reponse : `yes`.

Pourquoi : l'app Azar est rattachee au compte Expo `ketic`.

Question :

```txt
How would you like to register your devices?
```

Reponse : `Website - generates a registration URL to be opened on your devices`.

Pourquoi : c'est le plus simple pour enregistrer l'iPhone via QR code/profil iOS.

Question :

```txt
Do you want to log in to your Apple account?
```

Reponse : `yes`.

Pourquoi : EAS peut creer et valider les certificats/profils Apple automatiquement.

Question :

```txt
Generate a new Apple Distribution Certificate?
```

Reponse : `yes` au premier build iOS de l'app si aucun certificat utilisable n'existe.

Pourquoi : EAS cree un certificat Apple Distribution pour signer les builds.

Question :

```txt
Select devices for the ad hoc build
```

Reponse : selectionner l'iPhone voulu avec `Space`, puis valider avec `Return`.

Pourquoi : un build iOS preview/ad hoc ne s'installe que sur les appareils inclus dans le provisioning profile.

Message iPhone :

```txt
Mode developpeur requis
```

Action : activer `Reglages > Confidentialite et securite > Mode developpeur`, puis redemarrer l'iPhone.

Pourquoi : requis pour les builds internes/ad hoc. Pas requis pour les utilisateurs finaux via TestFlight/App Store.

### iOS production/App Store

Question :

```txt
Reuse this distribution certificate?
```

Reponse : `yes` si le certificat est deja lie a `@ketic/azar`.

Pourquoi : reutiliser un certificat valide evite de multiplier les credentials Apple sans raison.

Question :

```txt
Generate a new Apple Provisioning Profile?
```

Reponse : `yes` si EAS n'a pas encore de provisioning profile App Store valide pour `com.keticwork.azar`.

Pourquoi : un build production App Store a besoin d'un profil de signature different du profil ad hoc/preview.

Question App Store Connect :

```txt
UGS
```

Reponse conseillee : `com.keticwork.azar`.

Pourquoi : UGS/SKU est un identifiant interne stable pour App Store Connect. Il peut etre le bundle identifier ; il n'est pas affiche aux utilisateurs.

Observation App Store Connect :

```txt
Identifiant de lot tres long dans la liste
```

Reponse : normal si Apple affiche aussi le nom interne du Bundle ID avant `com.keticwork.azar`.

Point important : si un build est en cours mais que le code doit changer, faire `Ctrl+C`, corriger, verifier, commit/push, puis relancer le build. Ne pas envoyer a Apple un binaire deja obsolete.

### Apple contrats/conformite

Message :

```txt
Apple Developer Program License Agreement Updated
```

Action : aller sur https://developer.apple.com/account et accepter le nouveau contrat avec le compte titulaire.

Message :

```txt
Developers must provide their trader status to submit new apps or app updates for distribution in the European Union.
```

Action : dans App Store Connect, renseigner la conformite DSA. Pour un auto-entrepreneur publiant dans le cadre de son activite, traiter le statut comme professionnel/commercant et fournir un justificatif officiel si Apple le demande.

Note : le contrat payant/IAP n'est pas necessaire pour Azar V1 si l'app reste gratuite et sans achats integres.

### Fiche store

Question :

```txt
Faut-il parler des futurs modes des/cartes dans la description?
```

Reponse : non pour la V1.

Pourquoi : Apple/Google veulent que la fiche de l'app decrive ce qui est reellement disponible dans le build soumis. On pourra elargir la description quand les modes des/cartes existeront.

Question :

```txt
Connexion requise dans les informations de verification Apple?
```

Reponse : decocher.

Pourquoi : Azar n'a aucun compte ni ecran de connexion.

Question :

```txt
Lien EAS APK/IPA utilisable comme lien public?
```

Reponse : non.

Pourquoi : les artefacts EAS preview sont temporaires et internes. Les liens publics durables viendront des stores apres publication.

## Google Play - fiche conseillee

Nom : `Azar`

Description courte :

```txt
Lance une piece, personnalise les faces et suis tes resultats.
```

Description longue :

```txt
Azar est une application simple et soignee pour lancer pile ou face quand vous avez besoin de trancher rapidement une decision.

Personnalisez les deux faces de la piece avec vos propres libelles ou des images choisies depuis votre galerie, puis lancez la piece avec une animation claire. Azar garde aussi un historique local des derniers lancers, les ratios Pile / Face et vos predictions si vous voulez deviner le resultat avant le lancer.

L'application fonctionne sans compte, sans publicite, sans analytics et sans collecte de donnees. Les images choisies restent sur votre appareil et ne sont jamais envoyees.
```

Categorie conseillee : `Tools` / `Utilitaires`.

Prix : gratuit.

App access : aucune connexion requise.

Ads : non.

Gambling / jeux d'argent : non. Azar est un utilitaire de tirage pile ou face, sans mise, gain, monnaie, casino, pari ou recompense.

Target audience : ne pas presenter l'app comme concue specifiquement pour enfants. Choisir une audience generale adaptee au store.

## Google Play - Data Safety

Reponses conseillees pour la V1 actuelle :

- Collecte de donnees utilisateur : non.
- Partage de donnees utilisateur : non.
- Privacy policy : `https://keticwork.github.io/azar/privacy-policy.html`
- Photos/images : l'app demande l'acces galerie uniquement pour une selection locale faite par l'utilisateur. Aucune image ne quitte l'appareil.
- Suppression des donnees : aucune donnee serveur. Les donnees locales peuvent etre effacees depuis l'ecran Confidentialite de l'app ou supprimees en desinstallant l'app.

Toujours revoir ces reponses si on ajoute analytics, publicite, compte utilisateur, backend, crash reporting ou paiement.

## Apple App Store - fiche conseillee

Nom : `Azar`

Sous-titre :

```txt
Pile ou face personnalisable
```

Description :

```txt
Azar est une app simple et propre pour lancer pile ou face.

Personnalisez les deux faces avec vos propres textes ou des images de votre galerie, lancez la piece, puis consultez votre historique, vos ratios et vos predictions.

Azar fonctionne sans compte, sans publicite, sans analytics et sans collecte de donnees. Les images choisies restent sur votre appareil.
```

Categorie principale conseillee : `Utilities`.

Categorie secondaire possible : `Entertainment`.

Age rating probable : faible / tout public, a confirmer dans le questionnaire Apple.

App Privacy :

- Data collected: none.
- Tracking: no.
- Images galerie : usage local uniquement, pas de collecte ni partage.

DSA / Union europeenne : verifier le statut trader/non-trader dans App Store Connect avant publication en Europe.

## Sources officielles a verifier avant soumission

- Expo EAS Build : https://docs.expo.dev/build/introduction/
- Expo EAS Submit : https://docs.expo.dev/submit/introduction/
- Expo internal distribution : https://docs.expo.dev/build/internal-distribution/
- Google Play target API : https://developer.android.com/google/play/requirements/target-sdk
- Google Play Data safety : https://support.google.com/googleplay/android-developer/answer/10787469
- Apple upcoming requirements : https://developer.apple.com/news/upcoming-requirements/
