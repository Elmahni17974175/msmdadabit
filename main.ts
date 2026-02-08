/**
 * MSM AI Handler - Extension MakeCode (micro:bit)
 * DaDa:bit + WonderCam
 *
 * Extension "propre" :
 *  - uniquement des fonctions exportées (blocs)
 *  - aucun basic.forever()
 */

//% color=#00BCD4 icon="\uf085" block="MSM AI Handler"
//% groups='["Init","Capteurs","Suivi de ligne","Vision (WonderCam)","Bras","Mission"]'
namespace msmAIHandler {
    // -----------------------------
    // Variables internes (capteurs)
    // -----------------------------
    let S1 = false
    let S2 = false
    let S3 = false
    let S4 = false

    // Etat mission simple : 0 = reconnaissance / 1 = livraison (placement)
    let phase = 0
    let nextCount = 0

    // -----------------------------
    // Constantes (réglables)
    // -----------------------------
    const X_MIN = 80
    const X_MAX = 240
    const Y_CLOSE = 237

    // Vitesses (0..100)
    const SPEED_STRAIGHT = 55
    const SPEED_ADJUST = 44
    const SPEED_SOFT = 33

    // Servos du bras (comme dans ton code)
    const SERVO_ARM = 5   // 270°
    const SERVO_GRIP = 6  // 270° (ou selon montage)

    // -----------------------------
    // INIT
    // -----------------------------

    /**
     * Initialise DaDa:bit + WonderCam et met la WonderCam en détection couleur.
     */
    //% blockId=msm_aihandler_init
    //% block="initialiser AI Handler (DaDa:bit + WonderCam)"
    //% group="Init"
    export function init(): void {
        dadabit.dadabit_init()
        wondercam.wondercam_init(wondercam.DEV_ADDR.x32)
        wondercam.ChangeFunc(wondercam.Functions.ColorDetect)

        phase = 0
        nextCount = 0

        // Position initiale du bras (comme ton programme)
        dadabit.setLego270Servo(SERVO_ARM, -60, 300)
        dadabit.setLego270Servo(SERVO_GRIP, 15, 300)
        basic.pause(500)
    }

    // -----------------------------
    // CAPTEURS
    // -----------------------------

    /**
     * Met à jour les capteurs de ligne (S1..S4) pour une ligne noire sur fond clair.
     */
    //% blockId=msm_aihandler_update_line
    //% block="mettre à jour capteurs de ligne (noir)"
    //% group="Capteurs"
    export function updateLineSensors(): void {
        S1 = dadabit.line_followers(dadabit.LineFollowerSensors.S1, dadabit.LineColor.Black)
        S2 = dadabit.line_followers(dadabit.LineFollowerSensors.S2, dadabit.LineColor.Black)
        S3 = dadabit.line_followers(dadabit.LineFollowerSensors.S3, dadabit.LineColor.Black)
        S4 = dadabit.line_followers(dadabit.LineFollowerSensors.S4, dadabit.LineColor.Black)
    }

    /**
     * Lit S1..S4 (utile pour debug).
     */
    //% blockId=msm_aihandler_get_sensor
    //% block="capteur %sensor sur noir ?"
    //% sensor.defl=dadabit.LineFollowerSensors.S2
    //% group="Capteurs"
    export function isOnBlack(sensor: dadabit.LineFollowerSensors): boolean {
        if (sensor == dadabit.LineFollowerSensors.S1) return S1
        if (sensor == dadabit.LineFollowerSensors.S2) return S2
        if (sensor == dadabit.LineFollowerSensors.S3) return S3
        return S4
    }

    /**
     * Vrai si les 4 capteurs voient la ligne (zone destination / croisement).
     */
    //% blockId=msm_aihandler_at_destination
    //% block="destination atteinte ? (S1,S2,S3,S4 sur noir)"
    //% group="Capteurs"
    export function atDestination(): boolean {
        return S1 && S2 && S3 && S4
    }

    // -----------------------------
    // SUIVI DE LIGNE
    // -----------------------------

    /**
     * Arrêt des 4 servos 360°.
     */
    //% blockId=msm_aihandler_stop
    //% block="stopper le robot"
    //% group="Suivi de ligne"
    export function stop(): void {
        dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, 0)
        dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, 0)
        dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, 0)
        dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, 0)
    }

    /**
     * Suivi de ligne “général” (mêmes règles que ton code).
     */
    //% blockId=msm_aihandler_line_follow
    //% block="suivre la ligne (général)"
    //% group="Suivi de ligne"
    export function lineFollowGeneral(): void {
        // Tout droit
        if (S2 && S3) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, SPEED_STRAIGHT)

        // Ajuster à gauche
        } else if (S1 && S2 && (!S3 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, SPEED_ADJUST)

        // Ajuster à droite
        } else if (S3 && S4 && (!S1 && !S2)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, SPEED_ADJUST)

        // Dérive légère (S2 seul)
        } else if (S2 && (!S1 && !S3 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, SPEED_SOFT)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, SPEED_SOFT)

        // Dérive légère (S3 seul)
        } else if (S3 && (!S1 && !S2 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, SPEED_SOFT)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, SPEED_ADJUST)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, SPEED_SOFT)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, SPEED_ADJUST)

        // Extrême gauche (S1 seul)
        } else if (S1 && (!S2 && !S3 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, SPEED_STRAIGHT)

        // Extrême droite (S4 seul)
        } else if (S4 && (!S1 && !S2 && !S3)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, SPEED_STRAIGHT)
            dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, SPEED_STRAIGHT)
        }
    }

    // -----------------------------
    // VISION (WONDERCAM)
    // -----------------------------

    /**
     * Met à jour les résultats WonderCam (à appeler dans la boucle).
     */
    //% blockId=msm_aihandler_update_cam
    //% block="mettre à jour WonderCam"
    //% group="Vision (WonderCam)"
    export function updateCamera(): void {
        wondercam.UpdateResult()
    }

    /**
     * Vrai si couleur ID détectée et centrée en X.
     */
    //% blockId=msm_aihandler_color_centered
    //% block="couleur ID %id détectée et centrée ?"
    //% id.min=1 id.max=7 id.defl=1
    //% group="Vision (WonderCam)"
    export function isColorCentered(id: number): boolean {
        if (!wondercam.isDetectedColorId(id)) return false
        const x = wondercam.XOfColorId(wondercam.Options.Pos_X, id)
        return x >= X_MIN && x <= X_MAX
    }

    /**
     * Renvoie Y de la couleur ID (0..?) si détectée, sinon -1.
     */
    //% blockId=msm_aihandler_color_y
    //% block="Y de couleur ID %id"
    //% id.min=1 id.max=7 id.defl=1
    //% group="Vision (WonderCam)"
    export function colorY(id: number): number {
        if (!wondercam.isDetectedColorId(id)) return -1
        return wondercam.XOfColorId(wondercam.Options.Pos_Y, id)
    }

    // -----------------------------
    // BRAS (GRAB / DROP)
    // -----------------------------

    /**
     * Attraper l’objet (séquence bras).
     */
    //% blockId=msm_aihandler_grab
    //% block="attraper l'objet"
    //% group="Bras"
    export function grab(): void {
        stop()
        basic.pause(500)

        dadabit.setLego270Servo(SERVO_ARM, -5, 500)
        basic.pause(800)

        dadabit.setLego270Servo(SERVO_GRIP, -25, 500)
        basic.pause(800)

        dadabit.setLego270Servo(SERVO_ARM, -60, 500)
        basic.pause(800)

        phase = 1 // on passe en “livraison”
    }

    /**
     * Déposer l’objet (séquence bras).
     */
    //% blockId=msm_aihandler_drop
    //% block="déposer l'objet"
    //% group="Bras"
    export function drop(): void {
        stop()
        basic.pause(500)

        dadabit.setLego270Servo(SERVO_ARM, -5, 500)
        basic.pause(800)

        dadabit.setLego270Servo(SERVO_GRIP, 15, 500)
        basic.pause(800)

        dadabit.setLego270Servo(SERVO_ARM, -60, 500)
        basic.pause(800)

        phase = 0 // retour reconnaissance
    }

    /**
     * Lire la phase : 0 reconnaissance / 1 livraison.
     */
    //% blockId=msm_aihandler_get_phase
    //% block="phase mission (0=reconnaissance,1=livraison)"
    //% group="Mission"
    export function getPhase(): number {
        return phase
    }

    /**
     * Forcer la phase mission.
     */
    //% blockId=msm_aihandler_set_phase
    //% block="définir phase mission à %p"
    //% p.min=0 p.max=1 p.defl=0
    //% group="Mission"
    export function setPhase(p: number): void {
        phase = (p == 1) ? 1 : 0
        nextCount = 0
    }

    // -----------------------------
    // MISSION (logique “helper”)
    // -----------------------------

    /**
     * Approche l’objet couleur ID en suivant la ligne jusqu’à être proche, puis attrape.
     * - utilise un compteur (8 fois) pour éviter les fausses détections
     * Retourne true si un grab a été effectué.
     */
    //% blockId=msm_aihandler_approach_and_grab
    //% block="si couleur ID %id détectée (stable) alors approcher & attraper"
    //% id.min=1 id.max=7 id.defl=1
    //% group="Mission"
    export function approachAndGrabIfColor(id: number): boolean {
        if (phase != 0) return false

        // condition : détectée + centrée
        if (wondercam.isDetectedColorId(id)) {
            const x = wondercam.XOfColorId(wondercam.Options.Pos_X, id)
            if (x >= X_MIN && x <= X_MAX) {
                nextCount += 1

                // stable 8 fois
                if (nextCount > 8) {
                    nextCount = 0
                    music.play(music.tonePlayable(262, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)

                    // avancer jusqu’à proximité (Y >= seuil) ou disparition
                    while (wondercam.isDetectedColorId(id) && wondercam.XOfColorId(wondercam.Options.Pos_Y, id) < Y_CLOSE) {
                        updateCamera()
                        updateLineSensors()
                        lineFollowGeneral()
                    }

                    grab()
                    return true
                }
            }
        }

        return false
    }
}
