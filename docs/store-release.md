# Azar - checklist distribution stores

Derniere mise a jour : 7 juillet 2026.

Ce document sert de base pour publier Azar sur Google Play et Apple App Store. Il doit rester aligne avec le comportement reel de l'app.

## Etat actuel

- App Expo SDK 54.
- Identifiants natifs :
  - iOS : `com.keticwork.azar`
  - Android : `com.keticwork.azar`
- Privacy policy publique : https://keticwork.github.io/azar/privacy-policy.html
- Aucun compte utilisateur.
- Aucune publicite.
- Aucun analytics.
- Aucun achat integre.
- Aucune donnee envoyee a un serveur.
- Galerie utilisee uniquement pour choisir une image locale de piece.

## Etape 1 - Connexion Expo/EAS

Sur cette machine, EAS CLI repond mais le compte Expo n'est pas encore connecte.

```sh
npm run eas:login
npm run eas:whoami
```

Quand `whoami` affiche le nom du compte Expo, continuer.

## Etape 2 - Lier le projet EAS

```sh
npm run eas:configure
```

Cette commande peut ajouter un `extra.eas.projectId` dans `app.json`. Si c'est le cas :

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

## Etape 4 - Build preview iOS

Pour installer directement sur un iPhone hors TestFlight, il faut enregistrer l'appareil chez Apple via EAS.

```sh
npx eas-cli device:create
npm run build:preview:ios
```

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

Puis :

```sh
npm run build:ios
npm run submit:ios
```

EAS Submit envoie le build vers App Store Connect/TestFlight. Il faut ensuite terminer la fiche dans App Store Connect et envoyer a App Review.

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
- Suppression des donnees : aucune donnee serveur. Les donnees locales peuvent etre remises a zero dans l'app ou supprimees en desinstallant l'app.

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
