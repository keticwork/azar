# Azar

Azar est une mini-application mobile Expo / React Native. La V1 contient une experience simple et propre de pile ou face, sans compte, sans collecte de donnees et avec une permission galerie limitee a la personnalisation de la piece.

## Fonctionnalites V1

- Lancer pile ou face avec une animation de piece.
- Choisir une prediction Pile / Face avant le lancer.
- Personnaliser le texte affiche pour chaque face.
- Choisir une image locale pour chaque face de la piece.
- Conserver localement les personnalisations apres redemarrage.
- Afficher le dernier resultat.
- Suivre le nombre de lancers, le ratio pile / face, la serie en cours et la reussite des predictions.
- Consulter les derniers resultats.
- Reinitialiser la session.
- Consulter les informations de confidentialite directement dans l'app.

## Confidentialite

- Aucune creation de compte.
- Aucune publicite, analytics ou collecte de donnees.
- L'acces galerie sert uniquement a choisir une image pour la piece.
- Les images choisies sont copiees dans le stockage prive de l'app et ne sont pas envoyees.
- Politique de confidentialite : https://keticwork.github.io/azar/privacy-policy.html

## Commandes

```sh
npm start
npm run mobile
npm run mobile:lan
npm run ios
npm run android
npm run typecheck
npm run assets
```

## Tester sur mobile avec Expo Go

1. Installer Expo Go depuis l'App Store ou Google Play.
2. Lancer le serveur mobile fiable :

```sh
npm run mobile
```

3. Scanner le QR code affiche par Expo.

Cette commande utilise le mode tunnel Expo. C'est temporaire pour le developpement et plus fiable sur les vrais telephones quand le LAN local ne laisse pas Expo Go se connecter.
Les builds App Store et Google Play n'utiliseront pas ce tunnel.

Le tunnel depend du service externe utilise par Expo/ngrok. Le script retente automatiquement jusqu'a 3 fois si le tunnel coupe au demarrage (`remote gone away`, `failed to start tunnel`, etc.).
Ces erreurs peuvent apparaitre avant le QR code. Si une tentative finit par `Tunnel connected` puis `Tunnel ready`, le serveur est utilisable et les erreurs precedentes peuvent etre ignorees.
Pour changer le nombre de tentatives :

```sh
EXPO_TUNNEL_ATTEMPTS=5 npm run mobile
```

### Option LAN local

Le LAN est plus rapide, mais il depend du Wi-Fi, du firewall macOS, des permissions reseau local et de la box.

1. Connecter le telephone au meme reseau Wi-Fi que le Mac.
2. Lancer le serveur :

```sh
npm run mobile:lan
```

3. Ouvrir Expo Go et scanner le QR code affiche par Expo.

Si le QR code n'est pas visible, ouvrir manuellement l'URL Expo du projet dans Expo Go. Le navigateur affiche parfois du JSON sur `http://localhost:8081` : c'est normal, c'est le manifeste Expo, pas l'ecran de l'application.

### Depannage Expo Go

- Mettre Expo Go a jour sur iOS et Android.
- Verifier que le telephone est sur le meme Wi-Fi que le Mac.
- Tester l'URL `http://ADRESSE_IP_DU_MAC:8081` dans le navigateur du telephone. Si le JSON ne s'affiche pas, le telephone ne voit pas le serveur Expo.
- Sur iOS, verifier que `Reglages > Expo Go > Reseau local` est active.
- Desactiver temporairement VPN, iCloud Private Relay, proxy, partage de connexion ou isolation Wi-Fi invite.
- Si le LAN ne passe toujours pas, utiliser `npm run mobile`. Le tunnel expose temporairement le manifeste et le bundle via un service externe Expo, mais il ne sert qu'au developpement local.
- Si le tunnel echoue plusieurs fois, verifier https://status.ngrok.com/ puis relancer `npm run mobile`.

## Builds de distribution

Les builds store passeront par EAS Build.

```sh
npm run build:preview:android
npm run build:android
npm run build:ios
```

Les soumissions sont preparees avec :

```sh
npm run submit:android
npm run submit:ios
```

Avant la soumission, il faudra connecter Expo/EAS aux comptes Apple Developer et Google Play Console. L'application est configuree avec les identifiants natifs `com.keticwork.azar`.

## Assets

Les icones sont generees par `scripts/generate-assets.mjs`.

```sh
npm run assets
```

Le fichier `assets/icon.png` est volontairement genere en RGB sans canal alpha pour respecter les contraintes habituelles de l'icone iOS.
