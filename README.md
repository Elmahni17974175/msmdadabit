# msmdadabit — MSM AI Handler (DaDa:bit + WonderCam)

Extension MakeCode (micro:bit) pour le robot **DaDa:bit** (Hiwonder) avec la **WonderCam**, dédiée au projet **AI Handler** :
- **Suivi de ligne** (4 capteurs) — mode compétition (robuste & testé)
- **Mouvements simples** (avancer / reculer / tourner / pivoter / demi-tour)
- **Bras** (attraper / déposer / position départ)
- **Vision** (détection couleur ID + centrage + approche)
- **Macros** (cycles utiles, y compris “sans caméra”)

---

## ✅ Installation (MakeCode)

1. Ouvre MakeCode micro:bit
2. **Extensions** → colle l’URL du dépôt :
   - `https://github.com/Elmahni17974175/msmdadabit`
3. Valide, puis tu verras les blocs **msmdadabit** dans la boîte à outils.

---

## 🧩 Blocs disponibles (groupes)

> Les blocs sont rangés par groupes dans MakeCode.

### 1) Init
- `initialiser AI Handler (DaDa:bit + WonderCam)`

📸 Capture :
- `docs/01-group-init.png`

---

### 2) Réglages
- `régler vitesses suivi tout droit / correction / petit`
- `régler ports servos bras / pince`
- `régler angles bras haut / bas, pince ouverte / fermée`
- `régler seuils caméra Xmin / Xmax / Yproche / validations`

📸 Capture :
- `docs/02-group-reglages.png`

---

### 3) Capteurs (ligne)
- `mettre à jour capteurs de ligne (noir)`
- `capteur S? sur noir ?`
- `destination atteinte ? (S1,S2,S3,S4 sur noir)`

📸 Capture :
- `docs/03-group-capteurs.png`

---

### 4) Mouvements
- `stopper le robot`
- `avancer vitesse …`
- `reculer vitesse …`
- `tourner à gauche (arc) …`
- `tourner à droite (arc) …`
- `pivoter à gauche (sur place) …`
- `pivoter à droite (sur place) …`
- `faire demi-tour (recalage ligne) …` ✅ (robuste, testé)

📸 Capture :
- `docs/04-group-mouvements.png`

---

### 5) Suivi de ligne
- `suivre la ligne (mode compétition)` ✅

📸 Capture :
- `docs/05-group-suivi-ligne.png`

---

### 6) Vision (WonderCam)
- `mettre à jour WonderCam`
- `couleur ID … détectée et centrée ?`
- `Y de couleur ID …`

📸 Capture :
- `docs/06-group-vision.png`

---

### 7) Bras
- `position de départ du bras`
- `attraper l'objet`
- `déposer l'objet`
- `porte un objet ?`

📸 Capture :
- `docs/07-group-bras.png`

---

### 8) Macros (sans caméra)
- `bip validation`
- `si destination alors déposer puis demi-tour …`
- `cycle suiveur de ligne sans caméra`

📸 Capture :
- `docs/08-group-macros.png`

---

### 9) Mission
- `phase mission (0=reconnaissance,1=livraison)`
- `définir phase mission à …`
- `si couleur ID … détectée (stable) alors approcher & attraper` ✅

📸 Capture :
- `docs/09-group-mission.png`

---

## 🧠 Exemple complet : AI Handler (Caméra + Ligne + Dépôt)

### 🎯 Objectif
Le robot :
1. Suit la ligne
2. Détecte **Couleur ID1**
3. Approche l’objet (centrage X + seuil Y)
4. Attrape
5. Suit la ligne jusqu’à la destination (S1..S4 sur noir)
6. Dépose
7. Recommence

📸 Capture du programme (recommandée) :
- `docs/10-example-ai-handler-complet.png`

### ✅ Code (TypeScript) équivalent
```typescript
msmdadabit.init()

basic.forever(function () {
    // Toujours : mise à jour capteurs
    msmdadabit.updateCamera()
    msmdadabit.updateLineSensors()

    // Phase 0 : rechercher + attraper ID1
    if (msmdadabit.getPhase() == 0) {
        msmdadabit.approachAndGrabIfColor(1)
        // si pas attrapé, on continue de suivre la ligne
        msmdadabit.lineFollowGeneral()
    }

    // Phase 1 : livrer + déposer à destination
    if (msmdadabit.getPhase() == 1) {
        if (msmdadabit.atDestination()) {
            msmdadabit.drop()
            basic.pause(200)
        } else {
            msmdadabit.lineFollowGeneral()
        }
    }

    basic.pause(10)
})
