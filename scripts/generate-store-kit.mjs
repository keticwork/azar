import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'store-kit');
const sourceDir = path.join(outDir, 'sources');
const imageDir = path.join(outDir, 'images');
const appleImageDir = path.join(imageDir, 'apple-app-store');
const googleImageDir = path.join(imageDir, 'google-play');
const iconDir = path.join(outDir, 'icons');
const iconPath = path.join(root, 'assets', 'icon.png');
const iconDataUri = `data:image/png;base64,${readFileSync(iconPath).toString('base64')}`;

const appleScreenshots = [
  {
    file: '01-pile-ou-face-iphone-65',
    title: 'Pile ou face',
    eyebrow: 'AZAR',
    subtitle: 'Lancez une pièce claire, rapide et personnalisable.',
    result: 'Face',
    prediction: 'Prédiction réussie',
    pileCount: '7',
    faceCount: '9',
    history: ['#16 Face OK', '#15 Pile', '#14 Face'],
    mode: 'main',
  },
  {
    file: '02-personnalisation-iphone-65',
    title: 'Personnalisez',
    eyebrow: 'PIÈCE UNIQUE',
    subtitle: 'Changez les libellés et ajoutez vos images locales.',
    result: 'Pile',
    prediction: "Images stockées sur l'appareil",
    pileCount: 'Pile',
    faceCount: 'Face',
    history: ['Face pile', 'Face face', 'Enregistrer'],
    mode: 'settings',
  },
  {
    file: '03-statistiques-confidentialite-iphone-65',
    title: 'Simple et privé',
    eyebrow: 'SANS COMPTE',
    subtitle: 'Historique local, ratios, prédictions, aucune collecte.',
    result: 'Pile',
    prediction: 'Aucune donnée envoyée',
    pileCount: '56%',
    faceCount: '44%',
    history: ['Sans publicité', 'Sans analytics', 'Sans serveur'],
    mode: 'privacy',
  },
];

const copy = {
  appStoreDescription:
    'Azar est une app simple et propre pour lancer pile ou face.\n\n' +
    'Personnalisez les deux faces avec vos propres textes ou des images de votre galerie, lancez la pièce, puis consultez votre historique, vos ratios et vos prédictions.\n\n' +
    'Azar fonctionne sans compte, sans publicité, sans analytics et sans collecte de données. Les images choisies restent sur votre appareil.',
  googleLongDescription:
    'Azar est une application simple et soignée pour lancer pile ou face quand vous avez besoin de trancher rapidement une décision.\n\n' +
    'Personnalisez les deux faces de la pièce avec vos propres libellés ou des images choisies depuis votre galerie, puis lancez la pièce avec une animation claire. Azar garde aussi un historique local des derniers lancers, les ratios Pile / Face et vos prédictions si vous voulez deviner le résultat avant le lancer.\n\n' +
    'L’application fonctionne sans compte, sans publicité, sans analytics et sans collecte de données. Les images choisies restent sur votre appareil et ne sont jamais envoyées.',
};

function ensureDirs() {
  [
    outDir,
    sourceDir,
    imageDir,
    appleImageDir,
    googleImageDir,
    iconDir,
  ].forEach((dir) => mkdirSync(dir, { recursive: true }));
}

function write(file, content) {
  writeFileSync(path.join(outDir, file), `${content.trim()}\n`);
}

function htmlDocument({ width, height, body }) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: ${width}px;
        height: ${height}px;
        margin: 0;
        overflow: hidden;
        background: #f5f7fa;
        color: #15202b;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
      }
      .screen {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        padding: 118px 78px 84px;
        background:
          radial-gradient(circle at 82% 12%, rgba(31, 138, 112, 0.14), transparent 28%),
          linear-gradient(180deg, #f7fafc 0%, #eef4f1 100%);
      }
      .status {
        position: absolute;
        top: 28px;
        left: 78px;
        right: 78px;
        display: flex;
        justify-content: space-between;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .status-icons {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }
      .battery {
        position: relative;
        display: inline-block;
        width: 30px;
        height: 16px;
        border: 3px solid #15202b;
        border-radius: 5px;
      }
      .battery::before {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 2px;
        background: #15202b;
      }
      .battery::after {
        content: "";
        position: absolute;
        right: -7px;
        top: 4px;
        width: 4px;
        height: 6px;
        border-radius: 0 3px 3px 0;
        background: #15202b;
      }
      .brand {
        color: #1f8a70;
        font-size: 42px;
        font-weight: 900;
        letter-spacing: 0;
      }
      .headline {
        margin: 16px 0 14px;
        max-width: 820px;
        font-size: 82px;
        line-height: 0.98;
        font-weight: 950;
        letter-spacing: 0;
      }
      .subtitle {
        max-width: 760px;
        color: #475467;
        font-size: 34px;
        line-height: 1.22;
        font-weight: 650;
      }
      .coin-wrap {
        display: flex;
        justify-content: center;
        margin: 92px 0 42px;
      }
      .coin {
        position: relative;
        display: grid;
        place-items: center;
        width: 530px;
        height: 530px;
        border-radius: 50%;
        overflow: hidden;
        background:
          radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.85), transparent 24%),
          linear-gradient(140deg, #f5d169 0%, #bd7e21 52%, #8d5d18 100%);
        border: 18px solid #8b651c;
        box-shadow: 0 34px 70px rgba(16, 24, 40, 0.24);
      }
      .coin::before {
        content: "";
        position: absolute;
        inset: 48px;
        border-radius: 50%;
        border: 18px solid rgba(255, 255, 255, 0.32);
      }
      .coin::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.38), transparent 42%, rgba(54, 36, 10, 0.22));
      }
      .coin-label {
        position: relative;
        z-index: 1;
        max-width: 74%;
        text-align: center;
        font-size: 82px;
        line-height: 0.96;
        font-weight: 950;
        color: rgba(21, 32, 43, 0.82);
      }
      .result {
        text-align: center;
        font-size: 52px;
        font-weight: 930;
      }
      .feedback {
        margin: 10px auto 0;
        text-align: center;
        color: #1f8a70;
        font-size: 28px;
        font-weight: 850;
      }
      .button {
        margin: 44px auto 36px;
        width: 600px;
        border-radius: 34px;
        background: #15202b;
        color: white;
        padding: 31px 32px;
        text-align: center;
        font-size: 38px;
        font-weight: 930;
        box-shadow: 0 18px 46px rgba(21, 32, 43, 0.22);
      }
      .segments {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        margin: 0 0 34px;
      }
      .segment {
        min-height: 86px;
        border: 3px solid #cfd8e3;
        border-radius: 26px;
        background: #ffffff;
        padding: 24px;
        text-align: center;
        font-size: 30px;
        font-weight: 850;
      }
      .segment.active {
        background: #eaf7f2;
        border-color: #1f8a70;
        color: #1f8a70;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 22px;
      }
      .card {
        min-height: 188px;
        border: 2px solid #d9e1ea;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.78);
        padding: 30px;
      }
      .label {
        color: #344054;
        font-size: 27px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .value {
        margin-top: 18px;
        color: #15202b;
        font-size: 68px;
        font-weight: 950;
      }
      .detail {
        color: #1f8a70;
        font-size: 27px;
        font-weight: 900;
      }
      .history {
        margin-top: 32px;
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
      }
      .pill {
        border-radius: 999px;
        background: #ffffff;
        border: 2px solid #d9e1ea;
        padding: 17px 22px;
        font-size: 25px;
        font-weight: 850;
      }
      .modal {
        margin: 90px auto 0;
        width: 930px;
        border-radius: 30px;
        background: #ffffff;
        padding: 58px 54px;
        box-shadow: 0 28px 90px rgba(16, 24, 40, 0.22);
      }
      .modal-title {
        font-size: 54px;
        font-weight: 950;
        margin-bottom: 38px;
      }
      .input {
        border: 3px solid #d0d8e4;
        border-radius: 22px;
        background: #f8fafc;
        padding: 28px 30px;
        margin-bottom: 24px;
        font-size: 34px;
        font-weight: 850;
      }
      .row {
        display: grid;
        grid-template-columns: 136px 1fr;
        gap: 28px;
        align-items: center;
        border: 2px solid #e0e7ef;
        border-radius: 22px;
        padding: 22px;
        margin-bottom: 22px;
        background: #f8fafc;
      }
      .avatar {
        display: grid;
        place-items: center;
        width: 116px;
        height: 116px;
        border-radius: 58px;
        background: linear-gradient(145deg, #f4c95d, #c98824);
        font-size: 38px;
        font-weight: 950;
      }
      .row-title {
        font-size: 35px;
        font-weight: 950;
      }
      .row-actions {
        display: flex;
        gap: 18px;
        margin-top: 14px;
      }
      .mini-button {
        border: 2px solid #cfd8e3;
        border-radius: 20px;
        background: #ffffff;
        padding: 18px 24px;
        font-size: 27px;
        font-weight: 900;
      }
      .privacy-card {
        margin-top: 48px;
        border-radius: 26px;
        background: #ffffff;
        border: 2px solid #d9e1ea;
        padding: 42px;
      }
      .privacy-card h2 {
        margin: 0 0 18px;
        font-size: 45px;
      }
      .privacy-card p {
        margin: 0 0 16px;
        color: #475467;
        font-size: 30px;
        line-height: 1.3;
        font-weight: 650;
      }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function screenshotBody(item) {
  if (item.mode === 'settings') {
    return `<div class="screen">
      <div class="status"><span>9:41</span><span class="status-icons"><span>•••</span><span>5G</span><span class="battery"></span></span></div>
      <div class="brand">${item.eyebrow}</div>
      <h1 class="headline">${item.title}</h1>
      <div class="subtitle">${item.subtitle}</div>
      <div class="modal">
        <div class="modal-title">Personnalisation</div>
        <div class="input">Pile</div>
        <div class="input">Face</div>
        <div class="row">
          <div class="avatar" style="font-size: 22px;">Pile</div>
          <div>
            <div class="row-title">Pile</div>
            <div class="row-actions"><div class="mini-button">Image</div><div class="mini-button">Retirer</div></div>
          </div>
        </div>
        <div class="row">
          <div class="avatar" style="background: linear-gradient(145deg, #e33224, #8d35d6); color: white; font-size: 22px;">Face</div>
          <div>
            <div class="row-title">Face</div>
            <div class="row-actions"><div class="mini-button">Image</div><div class="mini-button">Retirer</div></div>
          </div>
        </div>
        <div class="button" style="width: 100%; margin-bottom: 0;">Enregistrer</div>
      </div>
    </div>`;
  }

  if (item.mode === 'privacy') {
    return `<div class="screen">
      <div class="status"><span>9:41</span><span class="status-icons"><span>•••</span><span>5G</span><span class="battery"></span></span></div>
      <div class="brand">${item.eyebrow}</div>
      <h1 class="headline">${item.title}</h1>
      <div class="subtitle">${item.subtitle}</div>
      <div class="grid" style="margin-top: 86px;">
        <div class="card"><div class="label">Pile</div><div class="value">${item.pileCount}</div></div>
        <div class="card"><div class="label">Face</div><div class="value">${item.faceCount}</div></div>
        <div class="card"><div class="label">Prédictions</div><div class="value">8/10</div><div class="detail">80%</div></div>
        <div class="card"><div class="label">Série</div><div class="value">3</div><div class="detail">Pile</div></div>
      </div>
      <div class="privacy-card">
        <h2>Confidentialité</h2>
        <p>Sans compte utilisateur.</p>
        <p>Sans publicité ni analytics.</p>
        <p>Les images choisies restent sur l’appareil.</p>
      </div>
      <div class="history">${item.history.map((text) => `<div class="pill">${text}</div>`).join('')}</div>
    </div>`;
  }

  return `<div class="screen">
    <div class="status"><span>9:41</span><span class="status-icons"><span>•••</span><span>5G</span><span class="battery"></span></span></div>
    <div class="brand">${item.eyebrow}</div>
    <h1 class="headline">${item.title}</h1>
    <div class="subtitle">${item.subtitle}</div>
    <div class="coin-wrap">
      <div class="coin"><div class="coin-label">${item.result}</div></div>
    </div>
    <div class="result">${item.result}</div>
    <div class="feedback">${item.prediction}</div>
    <div class="segments"><div class="segment">Pile</div><div class="segment active">Face</div></div>
    <div class="button">Lancer</div>
    <div class="grid">
      <div class="card"><div class="label">Lancers</div><div class="value">16</div></div>
      <div class="card"><div class="label">Pile</div><div class="value">${item.pileCount}</div><div class="detail">44%</div></div>
      <div class="card"><div class="label">Face</div><div class="value">${item.faceCount}</div><div class="detail">56%</div></div>
      <div class="card"><div class="label">Prédictions</div><div class="value">8/10</div><div class="detail">80%</div></div>
    </div>
    <div class="history">${item.history.map((text) => `<div class="pill">${text}</div>`).join('')}</div>
  </div>`;
}

function googleFeatureBody() {
  return `<div class="screen" style="width:1024px;height:500px;padding:48px 62px;background:linear-gradient(135deg,#f7fafc,#eaf7f2);">
    <div style="display:flex;align-items:center;gap:40px;height:100%;">
      <img src="${iconDataUri}" style="width:154px;height:154px;border-radius:34px;box-shadow:0 18px 48px rgba(16,24,40,.18);" />
      <div style="flex:1;">
        <div style="font-size:28px;font-weight:900;color:#1f8a70;letter-spacing:0;">AZAR</div>
        <div style="font-size:68px;line-height:.98;font-weight:950;color:#15202b;margin:10px 0 16px;">Pile ou face personnalisable</div>
        <div style="font-size:28px;line-height:1.22;font-weight:700;color:#475467;">Lancez, personnalisez et suivez vos résultats. Sans compte, sans publicité, sans collecte.</div>
      </div>
      <div class="coin" style="width:210px;height:210px;border-width:8px;"><div class="coin-label" style="font-size:34px;">Pile</div></div>
    </div>
  </div>`;
}

function writeTexts() {
  write(
    'README.md',
    `# Store kit Azar

Kit prepare pour remplir App Store Connect et Google Play Console.

## Dossiers

- \`images/apple-app-store/\` : captures iPhone 6,5 pouces en PNG \`1242 x 2688\`.
- \`images/google-play/\` : feature graphic Google Play \`1024 x 500\`.
- \`icons/\` : icones store exportees depuis les assets de l'app.
- \`sources/\` : pages HTML source utilisees pour generer les visuels.

## URLs publiques

- Politique de confidentialite : https://keticwork.github.io/azar/privacy-policy.html
- Assistance : https://keticwork.github.io/azar/support.html

## Notes

Les captures sont des visuels de listing prepares depuis l'interface reelle d'Azar. Pour la soumission finale, remplacer par des captures reelles iPhone si Apple demande une stricte correspondance pixel-par-pixel avec l'app installee.`
  );

  write(
    'apple-app-store-fields.md',
    `# Champs App Store Connect - Azar

## Informations de base

- Nom : Azar
- Plateforme : iOS
- Langue principale : Français
- Bundle ID : com.keticwork.azar
- UGS / SKU : com.keticwork.azar
- Version : 1.0
- Sous-titre : Pile ou face personnalisable
- Categorie principale : Utilitaires
- Categorie secondaire : Divertissement
- Copyright : © 2026 Kevin Pichon

## Page version iOS 1.0

Texte promotionnel : laisser vide pour la V1.

Description :

${copy.appStoreDescription}

Mots-cles :

pile ou face,hasard,décision,pièce,tirage,outil,choix

URL de l'assistance :

https://keticwork.github.io/azar/support.html

URL marketing :

Laisser vide pour la V1.

## Verification de l'app

Connexion requise : non, decocher la case.

Informations de connexion : laisser vide.

Coordonnees de contact :

- Prenom : Kevin
- Nom : Pichon
- E-mail : keticwork@gmail.com
- Telephone : utiliser le numero professionnel Apple Developer si demande.

Remarques pour l'equipe Apple :

Azar ne nécessite pas de compte utilisateur. L'application permet de lancer pile ou face, de personnaliser les libellés et d'ajouter localement des images aux deux faces de la pièce. Les images restent sur l'appareil et ne sont jamais envoyées à un serveur. L'app permet aussi d'effacer les données locales depuis l'écran Confidentialité. Elle ne contient pas de publicité, pas d'analytics, pas d'achat intégré et aucune fonctionnalité de pari, mise, gain ou récompense.

Publication :

- Pour la premiere soumission, choisir "Publier cette version manuellement" si vous voulez verifier la fiche apres approbation.
- Sinon "Publier automatiquement" publiera des qu'Apple approuve.`
  );

  write(
    'apple-privacy-fields.md',
    `# Confidentialite Apple - Azar

Reponses conseillees pour la V1 actuelle.

## Donnees collectees

Azar ne collecte aucune donnee utilisateur.

## Tracking

Non. Azar ne suit pas les utilisateurs et n'utilise aucun identifiant publicitaire.

## Photos / galerie

Usage local uniquement : l'utilisateur choisit une image pour personnaliser une face de la piece. L'image reste sur l'appareil et n'est pas envoyee.

## Suppression locale

Les reglages, images et statistiques locales peuvent etre effaces depuis l'ecran Confidentialite de l'app.

## Compte utilisateur

Aucun compte utilisateur.

## Publicite / analytics

Aucune publicite. Aucun analytics. Aucun SDK de suivi.

## Achats integres

Aucun achat integre.`
  );

  write(
    'google-play-fields.md',
    `# Champs Google Play - Azar

## Creation de l'app

- Nom : Azar
- Langue par defaut : Français (France)
- Type : Application
- Gratuit / payant : Gratuit
- App ou jeu : Application
- Categorie conseillee : Outils / Utilitaires

## Fiche principale

Nom de l'application :

Azar

Description courte :

Lance une pièce, personnalise les faces et suis tes résultats.

Description complete :

${copy.googleLongDescription}

Email de contact :

keticwork@gmail.com

Site web / assistance :

https://keticwork.github.io/azar/support.html

Politique de confidentialite :

https://keticwork.github.io/azar/privacy-policy.html

## Declaration Data Safety

- Collecte de donnees utilisateur : non.
- Partage de donnees utilisateur : non.
- Chiffrement en transit : non applicable, aucune donnee envoyee.
- Suppression de donnees : donnees locales supprimables depuis l'ecran Confidentialite de l'app, ou en desinstallant l'app.
- Photos/images : acces galerie uniquement sur action utilisateur pour personnaliser la piece. Aucune image ne quitte l'appareil.

## Contenu sensible

- Jeux d'argent : non.
- Paris, mises, gains, casino : non.
- Publicite : non.
- Achats integres : non.`
  );
}

function writeHtmlSources() {
  for (const item of appleScreenshots) {
    const html = htmlDocument({
      width: 1242,
      height: 2688,
      body: screenshotBody(item),
    });
    writeFileSync(path.join(sourceDir, `${item.file}.html`), html);
  }

  writeFileSync(
    path.join(sourceDir, 'google-feature-graphic.html'),
    htmlDocument({
      width: 1024,
      height: 500,
      body: googleFeatureBody(),
    }),
  );
}

function renderWithChrome() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  if (!existsSync(chromePath)) {
    console.warn('Google Chrome not found; HTML sources were generated without PNG rendering.');
    return;
  }

  const jobs = [
    ...appleScreenshots.map((item) => ({
      width: 1242,
      height: 2688,
      input: path.join(sourceDir, `${item.file}.html`),
      output: path.join(appleImageDir, `${item.file}.png`),
    })),
    {
      width: 1024,
      height: 500,
      input: path.join(sourceDir, 'google-feature-graphic.html'),
      output: path.join(googleImageDir, 'feature-graphic-1024x500.png'),
    },
  ];

  for (const job of jobs) {
    const result = spawnSync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        `--window-size=${job.width},${job.height}`,
        `--screenshot=${job.output}`,
        pathToFileURL(job.input).href,
      ],
      { stdio: 'inherit' },
    );

    if (result.status !== 0) {
      throw new Error(`Chrome failed to render ${job.input}`);
    }
  }
}

function writeIcons() {
  writeFileSync(path.join(iconDir, 'app-icon-1024.png'), readFileSync(iconPath));

  const result = spawnSync(
    'sips',
    ['-z', '512', '512', iconPath, '--out', path.join(iconDir, 'google-play-icon-512.png')],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    console.warn('Could not generate Google Play 512px icon with sips.');
  }
}

ensureDirs();
writeTexts();
writeHtmlSources();
writeIcons();

if (process.argv.includes('--render')) {
  renderWithChrome();
}

console.log(`Store kit generated in ${outDir}`);
