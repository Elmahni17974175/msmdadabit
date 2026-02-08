/**
 * msmdadabit - Extension MakeCode (micro:bit)
 * DaDa:bit + WonderCam (via dadabit)
 *
 * Version pédagogique :
 * - Le bloc "approcher & attraper couleur ID" est une ACTION (pas une condition)
 */

//% color=#00BCD4 icon="\uf085" block="msmdadabit"
//% groups='["Init","Réglages","Capteurs","Mouvements","Suivi de ligne","Vision (WonderCam)","Bras","Macros (sans caméra)","Mission"]'
namespace msmdadabit {
    // =========================================================
    // CAPTEURS LIGNE (internes)
    // =========================================================
    let S1 = false
    let S2 = false
    let S3 = false
    let S4 = false

    // =========================================================
    // ETAT MISSION
    // =========================================================
    // 0 = reconnaissance / 1 = livraison
    let phase = 0
    let nextCount = 0

    // Pour debug/pédagogie : est-ce que la dernière tentative a attrapé ?
    let lastGrab = false

    // =========================================================
    // PARAMETRES CAMERA (par défaut = seuils officiels)
    // =========================================================
    let X_MIN = 80
    let X_MAX = 240
    let Y_CLOSE = 237
    let VALIDATIONS = 8

    // =========================================================
    // VITESSES (réglables)
    // =========================================================
    let vToutDroit = 55
    let vCorrection = 44
    let vPetit = 33

    // =========================================================
    // SERVOS BRAS (réglables)
    // =========================================================
    let SERVO_ARM = 5
    let SERVO_GRIP = 6

    let brasHaut = -60
    let brasBas = -5
    let pinceOuverte = 15
    let pinceFermee = -25

    // Etat manipulation
    let porteObjet = false

    // =========================================================
    // OUTILS MOTEURS (internes)
    // =========================================================
    function stopInterne(): void {
        dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, 0)
        dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, 0)
        dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, 0)
        dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, 0)
    }

    function avancerInterne(v: number): void {
        dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, v)
    }

    function reculerInterne(v: number): void {
        dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, v)
    }

    function pivoterDroiteInterne(v: number): void {
        dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, v)
    }

    function pivoterGaucheInterne(v: number): void {
        dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, v)
    }

    function tournerGaucheArcInterne(v: number): void {
        const vLent = Math.max(0, v - 15)
        dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, vLent)
        dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, vLent)
        dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, v)
        dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, v)
    }

    function tournerDroiteArcInterne(v: number): void {
        const vLent = Math.max(0, v - 15)
        dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, vLent)
        dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, vLent)
        dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, v)
        dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, v)
    }

    // =========================================================
    // INIT
    // =========================================================
    //% blockId=msm_aihandler_init
    //% block="initialiser AI Handler (DaDa:bit + WonderCam)"
    //% group="Init"
    export function init(): void {
        dadabit.dadabit_init()
        wondercam.wondercam_init(wondercam.DEV_ADDR.x32)
        wondercam.ChangeFunc(wondercam.Functions.ColorDetect)

        phase = 0
        nextCount = 0
        porteObjet = false
        lastGrab = false

        armHome()
        stopInterne()
        basic.pause(300)
    }

    // =========================================================
    // REGLAGES
    // =========================================================
    //% blockId=msm_set_speeds
    //% block="régler vitesses suivi tout droit %vd correction %vc petit %vp"
    //% vd.defl=55 vc.defl=44 vp.defl=33
    //% group="Réglages"
    export function setLineSpeeds(vd: number = 55, vc: number = 44, vp: number = 33): void {
        vToutDroit = vd
        vCorrection = vc
        vPetit = vp
    }

    //% blockId=msm_set_arm_ports
    //% block="régler ports servos bras %bras pince %pince"
    //% bras.defl=5 pince.defl=6
    //% group="Réglages"
    export function setArmPorts(bras: number = 5, pince: number = 6): void {
        SERVO_ARM = bras
        SERVO_GRIP = pince
    }

    //% blockId=msm_set_arm_angles
    //% block="régler angles bras haut %bh bras bas %bb pince ouverte %po pince fermée %pf"
    //% bh.defl=-60 bb.defl=-5 po.defl=15 pf.defl=-25
    //% group="Réglages"
    export function setArmAngles(bh: number = -60, bb: number = -5, po: number = 15, pf: number = -25): void {
        brasHaut = bh
        brasBas = bb
        pinceOuverte = po
        pinceFermee = pf
    }

    //% blockId=msm_set_cam_thresholds
    //% block="régler seuils caméra Xmin %xmin Xmax %xmax Yproche %y validations %val"
    //% xmin.defl=80 xmax.defl=240 y.defl=237 val.defl=8
    //% group="Réglages"
    export function setCameraThresholds(xmin: number = 80, xmax: number = 240, y: number = 237, val: number = 8): void {
        X_MIN = xmin
        X_MAX = xmax
        Y_CLOSE = y
        VALIDATIONS = val
    }

    // =========================================================
    // CAPTEURS
    // =========================================================
    //% blockId=msm_update_line
    //% block="mettre à jour capteurs de ligne (noir)"
    //% group="Capteurs"
    export function updateLineSensors(): void {
        S1 = dadabit.line_followers(dadabit.LineFollowerSensors.S1, dadabit.LineColor.Black)
        S2 = dadabit.line_followers(dadabit.LineFollowerSensors.S2, dadabit.LineColor.Black)
        S3 = dadabit.line_followers(dadabit.LineFollowerSensors.S3, dadabit.LineColor.Black)
        S4 = dadabit.line_followers(dadabit.LineFollowerSensors.S4, dadabit.LineColor.Black)
    }

    //% blockId=msm_at_destination
    //% block="destination atteinte ? (S1,S2,S3,S4 sur noir)"
    //% group="Capteurs"
    export function atDestination(): boolean {
        return S1 && S2 && S3 && S4
    }

    // =========================================================
    // MOUVEMENTS
    // =========================================================
    //% blockId=msm_move_stop
    //% block="stopper le robot"
    //% group="Mouvements"
    export function stop(): void {
        stopInterne()
    }

    //% blockId=msm_move_forward
    //% block="avancer vitesse %v"
    //% v.defl=55
    //% group="Mouvements"
    export function forward(v: number = 55): void {
        avancerInterne(v)
    }

    //% blockId=msm_move_backward
    //% block="reculer vitesse %v"
    //% v.defl=55
    //% group="Mouvements"
    export function backward(v: number = 55): void {
        reculerInterne(v)
    }

    //% blockId=msm_move_turn_left
    //% block="tourner à gauche (arc) vitesse %v"
    //% v.defl=55
    //% group="Mouvements"
    export function turnLeft(v: number = 55): void {
        tournerGaucheArcInterne(v)
    }

    //% blockId=msm_move_turn_right
    //% block="tourner à droite (arc) vitesse %v"
    //% v.defl=55
    //% group="Mouvements"
    export function turnRight(v: number = 55): void {
        tournerDroiteArcInterne(v)
    }

    //% blockId=msm_move_pivot_left
    //% block="pivoter à gauche (sur place) vitesse %v"
    //% v.defl=44
    //% group="Mouvements"
    export function pivotLeft(v: number = 44): void {
        pivoterGaucheInterne(v)
    }

    //% blockId=msm_move_pivot_right
    //% block="pivoter à droite (sur place) vitesse %v"
    //% v.defl=44
    //% group="Mouvements"
    export function pivotRight(v: number = 44): void {
        pivoterDroiteInterne(v)
    }

    //% blockId=msm_move_u_turn
    //% block="faire demi-tour (recalage ligne) vitesse %v"
    //% v.defl=44
    //% group="Mouvements"
    export function uTurn(v: number = 44): void {
        pivoterDroiteInterne(v)
        basic.pause(500)

        updateLineSensors()
        while (S1 || S2 || !(S3 && S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, v)
            dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, v)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, v)
            dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, v)
            updateLineSensors()
        }
        stopInterne()
    }

    // =========================================================
    // SUIVI DE LIGNE
    // =========================================================
    //% blockId=msm_line_follow_compet
    //% block="suivre la ligne (mode compétition)"
    //% group="Suivi de ligne"
    export function lineFollowGeneral(): void {
        if (S2 && S3) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, vToutDroit)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, vToutDroit)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, vToutDroit)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, vToutDroit)

        } else if (S1 && S2 && (!S3 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, vCorrection)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, vCorrection)
            dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, vCorrection)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, vCorrection)

        } else if (S3 && S4 && (!S1 && !S2)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, vCorrection)
            dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, vCorrection)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, vCorrection)
            dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, vCorrection)

        } else if (S2 && !S1 && (!S3 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, vCorrection)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, vPetit)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, vCorrection)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, vPetit)

        } else if (S3 && !S1 && (!S2 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, vPetit)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, vCorrection)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, vPetit)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, vCorrection)

        } else if (S1 && !S2 && (!S3 && !S4)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Clockwise, vToutDroit)
            dadabit.setLego360Servo(2, dadabit.Oriention.Clockwise, vToutDroit)
            dadabit.setLego360Servo(3, dadabit.Oriention.Clockwise, vToutDroit)
            dadabit.setLego360Servo(4, dadabit.Oriention.Clockwise, vToutDroit)

        } else if (S4 && !S1 && (!S2 && !S3)) {
            dadabit.setLego360Servo(1, dadabit.Oriention.Counterclockwise, vToutDroit)
            dadabit.setLego360Servo(2, dadabit.Oriention.Counterclockwise, vToutDroit)
            dadabit.setLego360Servo(3, dadabit.Oriention.Counterclockwise, vToutDroit)
            dadabit.setLego360Servo(4, dadabit.Oriention.Counterclockwise, vToutDroit)
        }
    }

    // =========================================================
    // VISION
    // =========================================================
    //% blockId=msm_update_cam
    //% block="mettre à jour WonderCam"
    //% group="Vision (WonderCam)"
    export function updateCamera(): void {
        wondercam.UpdateResult()
    }

    // =========================================================
    // BRAS
    // =========================================================
    //% blockId=msm_arm_home
    //% block="position de départ du bras"
    //% group="Bras"
    export function armHome(): void {
        dadabit.setLego270Servo(SERVO_ARM, brasHaut, 300)
        dadabit.setLego270Servo(SERVO_GRIP, pinceOuverte, 300)
        basic.pause(300)
        porteObjet = false
    }

    //% blockId=msm_grab
    //% block="attraper l'objet"
    //% group="Bras"
    export function grab(): void {
        stopInterne()
        basic.pause(200)

        dadabit.setLego270Servo(SERVO_ARM, brasBas, 500)
        basic.pause(400)

        dadabit.setLego270Servo(SERVO_GRIP, pinceFermee, 500)
        basic.pause(400)

        dadabit.setLego270Servo(SERVO_ARM, brasHaut, 500)
        basic.pause(400)

        porteObjet = true
        phase = 1
    }

    //% blockId=msm_drop
    //% block="déposer l'objet"
    //% group="Bras"
    export function drop(): void {
        stopInterne()
        basic.pause(200)

        dadabit.setLego270Servo(SERVO_ARM, brasBas, 500)
        basic.pause(400)

        dadabit.setLego270Servo(SERVO_GRIP, pinceOuverte, 500)
        basic.pause(400)

        dadabit.setLego270Servo(SERVO_ARM, brasHaut, 500)
        basic.pause(400)

        porteObjet = false
        phase = 0
    }

    //% blockId=msm_is_carrying
    //% block="porte un objet ?"
    //% group="Bras"
    export function isCarryingObject(): boolean {
        return porteObjet
    }

    // =========================================================
    // MACROS (sans caméra)
    // =========================================================
    //% blockId=msm_beep_validation
    //% block="bip validation"
    //% group="Macros (sans caméra)"
    export function beepValidation(): void {
        music.play(music.tonePlayable(262, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    }

    // =========================================================
    // MISSION
    // =========================================================
    //% blockId=msm_get_phase
    //% block="phase mission (0=reconnaissance,1=livraison)"
    //% group="Mission"
    export function getPhase(): number {
        return phase
    }

    //% blockId=msm_set_phase
    //% block="définir phase mission à %p"
    //% p.min=0 p.max=1 p.defl=0
    //% group="Mission"
    export function setPhase(p: number): void {
        phase = (p == 1) ? 1 : 0
        nextCount = 0
    }

    //% blockId=msm_last_grab
    //% block="dernière tentative a attrapé ?"
    //% group="Mission"
    export function lastAttemptGrabbed(): boolean {
        return lastGrab
    }

    /**
     * ACTION : chercher un cube de couleur ID, s'en approcher puis l'attraper.
     * - Le robot ne fait rien si: pas détecté / pas stable / pas centré / déjà en livraison.
     * - Quand il attrape: bip + bras + passe en phase 1.
     */
    //% blockId=msm_approach_grab_color
    //% block="approcher & attraper couleur ID %id"
    //% id.min=1 id.max=7 id.defl=1
    //% group="Mission"
    export function approachAndGrabIfColor(id: number): void {
        lastGrab = false

        // seulement en reconnaissance
        if (phase != 0) return

        // détectée ?
        if (!wondercam.isDetectedColorId(id)) {
            nextCount = 0
            return
        }

        // centrée ?
        const x = wondercam.XOfColorId(wondercam.Options.Pos_X, id)
        if (x < X_MIN || x > X_MAX) {
            nextCount = 0
            return
        }

        // stabilité
        nextCount += 1
        if (nextCount <= VALIDATIONS) return

        // validé
        nextCount = 0
        beepValidation()

        // approche : avancer jusqu'à proximité
        while (wondercam.isDetectedColorId(id) &&
            wondercam.XOfColorId(wondercam.Options.Pos_Y, id) < Y_CLOSE) {
            updateCamera()
            updateLineSensors()
            lineFollowGeneral()
        }

        // attraper
        grab()
        lastGrab = true
    }

    // =========================================================
    // MACROS AI HANDLER (utilisent le bloc ACTION)
    // =========================================================
    //% blockId=msm_macro_reconnaissance
    //% block="macro AI Handler : reconnaissance (suivre ligne + attraper couleur ID %id)"
    //% id.min=1 id.max=7 id.defl=1
    //% group="Mission"
    export function macroReconnaissance(id: number = 1): void {
        updateCamera()
        updateLineSensors()
        lineFollowGeneral()
        approachAndGrabIfColor(id)
    }

    //% blockId=msm_macro_livraison
    //% block="macro AI Handler : livraison (aller destination + déposer + demi-tour) vitesse %v"
    //% v.defl=44
    //% group="Mission"
    export function macroLivraison(v: number = 44): void {
        updateCamera()
        updateLineSensors()

        if (atDestination()) {
            drop()
            basic.pause(200)
            uTurn(v)
            basic.pause(200)
        } else {
            lineFollowGeneral()
        }
    }

    // =========================================================
    // BLOCS UTILS (AJOUTS - sans casser l'existant)
    // =========================================================

    /**
     * Lire un capteur individuel (valeur mémorisée après updateLineSensors()).
     */
    //% blockId=msm_is_on_black
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
     * Nombre de capteurs sur noir (0..4) (après updateLineSensors()).
     */
    //% blockId=msm_black_count
    //% block="nombre de capteurs sur noir"
    //% group="Capteurs"
    export function blackCount(): number {
        let c = 0
        if (S1) c++
        if (S2) c++
        if (S3) c++
        if (S4) c++
        return c
    }

    /**
     * Vrai si au moins 3 capteurs sur noir (barre/checkpoint).
     */
    //% blockId=msm_on_bar_3plus
    //% block="barre détectée ? (au moins 3 capteurs sur noir)"
    //% group="Capteurs"
    export function onBar3Plus(): boolean {
        return blackCount() >= 3
    }

    /**
     * Vrai si tous les capteurs sont sur blanc (ligne perdue).
     */
    //% blockId=msm_all_white
    //% block="ligne perdue ? (tous blancs)"
    //% group="Capteurs"
    export function allWhite(): boolean {
        return !S1 && !S2 && !S3 && !S4
    }

    // =========================================================
    // WONDERCAM - MODES UTILS
    // =========================================================
    //% blockId=msm_cam_mode_apriltag
    //% block="caméra mode AprilTag"
    //% group="Vision (WonderCam)"
    export function camModeAprilTag(): void {
        wondercam.ChangeFunc(wondercam.Functions.AprilTag)
        basic.pause(120)
    }

    //% blockId=msm_cam_mode_number
    //% block="caméra mode Nombre"
    //% group="Vision (WonderCam)"
    export function camModeNumber(): void {
        wondercam.ChangeFunc(wondercam.Functions.NumberRecognition)
        basic.pause(120)
    }

    //% blockId=msm_cam_mode_color
    //% block="caméra mode Couleur"
    //% group="Vision (WonderCam)"
    export function camModeColor(): void {
        wondercam.ChangeFunc(wondercam.Functions.ColorDetect)
        basic.pause(120)
    }

    /**
     * Lire AprilTag A/B avec délai max (ms).
     * Retourne : tagA, tagB, ou -1.
     */
    //% blockId=msm_read_tag_ab
    //% block="lire AprilTag A %tagA ou B %tagB (timeout %timeoutMs ms)"
    //% tagA.defl=1 tagB.defl=2 timeoutMs.defl=6000
    //% group="Vision (WonderCam)"
    export function readAprilTagAB(tagA: number = 1, tagB: number = 2, timeoutMs: number = 6000): number {
        let t = 0
        camModeAprilTag()
        while (t < timeoutMs) {
            updateCamera()
            if (wondercam.isDetecteAprilTagId(tagA)) return tagA
            if (wondercam.isDetecteAprilTagId(tagB)) return tagB
            basic.pause(120)
            t += 120
        }
        return -1
    }

    /**
     * Lire un nombre 1/2 de manière stable (6 fois) avec délai max (ms).
     * Retourne 1 ou 2 (par défaut 1).
     */
    //% blockId=msm_read_number_stable
    //% block="lire nombre 1/2 stable (timeout %timeoutMs ms)"
    //% timeoutMs.defl=2500
    //% group="Vision (WonderCam)"
    export function readNumberStable(timeoutMs: number = 2500): number {
        camModeNumber()
        let t = 0
        let last = 0
        let hits = 0

        while (t < timeoutMs) {
            updateCamera()
            if (wondercam.MaxConfidenceOfNumber() >= 0.4) {
                const n = wondercam.NumberWithMaxConfidence()
                if (n == 1 || n == 2) {
                    if (n == last) hits++
                    else { last = n; hits = 1 }
                    if (hits >= 6) return n
                }
            }
            basic.pause(100)
            t += 100
        }
        return 1
    }

    // =========================================================
    // SERVO DÉPÔT (SMART TRANSPORT)
    // =========================================================
    /**
     * Déposer un cube avec un servo 270° (ex: port 6).
     * - Va à l'angle "dépôt", attend, puis revient à "repos".
     */
    //% blockId=msm_drop_servo270
    //% block="déposer cube servo270 port %port angle dépôt %dropAng angle repos %restAng temps dépôt %dropMs temps repos %restMs pause %holdMs"
    //% port.defl=6 dropAng.defl=-100 restAng.defl=-20 dropMs.defl=200 restMs.defl=500 holdMs.defl=2000
    //% group="Mouvements"
    export function dropByServo270(
        port: number = 6,
        dropAng: number = -100,
        restAng: number = -20,
        dropMs: number = 200,
        restMs: number = 500,
        holdMs: number = 2000
    ): void {
        music.playTone(523, music.beat(BeatFraction.Quarter))
        basic.pause(150)
        dadabit.setLego270Servo(port, dropAng, dropMs)
        basic.pause(holdMs)
        dadabit.setLego270Servo(port, restAng, restMs)
        basic.pause(300)
    }
}
