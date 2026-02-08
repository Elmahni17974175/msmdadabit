/**
 * msmdadabit - Extension MakeCode (micro:bit)
 * DaDa:bit + WonderCam (via dadabit)
 *
 * Version pédagogique :
 * - "approcher & attraper couleur ID" est une ACTION (pas une condition)
 * - Blocs génériques : AprilTag + Chiffres (pas limités à 1/2)
 * - Smart Transport : config / reset / step / done (encore plus blocs)
 */

//% color=#00BCD4 icon="\uf085" block="msmdadabit"
//% groups='["Init","Réglages","Capteurs","Mouvements","Suivi de ligne","Vision (WonderCam)","Bras","Mission","Smart Transport"]'
namespace msmdadabit {
    // =========================================================
    // CAPTEURS LIGNE (internes)
    // =========================================================
    let S1 = false
    let S2 = false
    let S3 = false
    let S4 = false

    // =========================================================
    // ETAT MISSION (AI Handler)
    // =========================================================
    // 0 = reconnaissance / 1 = livraison
    let phase = 0
    let nextCount = 0
    let lastGrab = false

    // =========================================================
    // PARAMETRES CAMERA (par défaut = seuils officiels AI Handler)
    // =========================================================
    let X_MIN = 80
    let X_MAX = 240
    let Y_CLOSE = 237
    let VALIDATIONS = 8

    // =========================================================
    // VITESSES (réglables - suiveur de ligne)
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
    /**
     * Initialise DaDa:bit + WonderCam (par défaut en détection couleur).
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

    //% blockId=msm_on_bar_3plus
    //% block="barre détectée ? (au moins 3 capteurs sur noir)"
    //% group="Capteurs"
    export function onBar3Plus(): boolean {
        return blackCount() >= 3
    }

    //% blockId=msm_all_white
    //% block="ligne perdue ? (tous blancs)"
    //% group="Capteurs"
    export function allWhite(): boolean {
        return !S1 && !S2 && !S3 && !S4
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

    /**
     * Demi-tour robuste avec recalage ligne (inspiré du code testé).
     */
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

    /**
     * Déposer un cube avec un servo 270° (Smart Transport).
     */
    //% blockId=msm_drop_servo270
    //% block="déposer cube servo270 port %port angle dépôt %dropAng angle repos %restAng temps dépôt %dropMs temps repos %restMs pause %holdMs"
    //% port.defl=6 dropAng.defl=-100 restAng.defl=-20 dropMs.defl=200 restMs.defl=500 holdMs.defl=2000
    //% group="Mouvements"
    export function dropByServo270(port: number = 6, dropAng: number = -100, restAng: number = -20, dropMs: number = 200, restMs: number = 500, holdMs: number = 2000): void {
        music.playTone(523, music.beat(BeatFraction.Quarter))
        basic.pause(150)
        dadabit.setLego270Servo(port, dropAng, dropMs)
        basic.pause(holdMs)
        dadabit.setLego270Servo(port, restAng, restMs)
        basic.pause(300)
    }

    // =========================================================
    // SUIVI DE LIGNE (mode compétition)
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
    // VISION (WonderCam)
    // =========================================================
    //% blockId=msm_update_cam
    //% block="mettre à jour WonderCam"
    //% group="Vision (WonderCam)"
    export function updateCamera(): void {
        wondercam.UpdateResult()
    }

    //% blockId=msm_cam_mode_apriltag
    //% block="caméra mode AprilTag"
    //% group="Vision (WonderCam)"
    export function camModeAprilTag(): void {
        wondercam.ChangeFunc(wondercam.Functions.AprilTag)
        basic.pause(120)
    }

    //% blockId=msm_cam_mode_number
    //% block="caméra mode Reconnaissance chiffres"
    //% group="Vision (WonderCam)"
    export function camModeNumber(): void {
        wondercam.ChangeFunc(wondercam.Functions.NumberRecognition)
        basic.pause(120)
    }

    //% blockId=msm_cam_mode_color
    //% block="caméra mode Détection couleur"
    //% group="Vision (WonderCam)"
    export function camModeColor(): void {
        wondercam.ChangeFunc(wondercam.Functions.ColorDetect)
        basic.pause(120)
    }

    /**
     * ✅ Nouveau nom générique AprilTag
     * Retour : tagA, tagB, ou -1.
     */
    //% blockId=msm_detect_apriltag_ab
    //% block="détecter AprilTag A %tagA ou B %tagB (timeout %timeoutMs ms)"
    //% tagA.defl=1 tagB.defl=2 timeoutMs.defl=6000
    //% group="Vision (WonderCam)"
    export function detectAprilTagAB(tagA: number = 1, tagB: number = 2, timeoutMs: number = 6000): number {
        camModeAprilTag()
        let t = 0
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
     * ✅ Nouveau nom générique Chiffres (1..9 typiquement)
     * Retour : chiffre détecté, sinon 1 par défaut.
     */
    //% blockId=msm_detect_number_stable
    //% block="détecter chiffre stable (timeout %timeoutMs ms)"
    //% timeoutMs.defl=2500
    //% group="Vision (WonderCam)"
    export function detectNumberStable(timeoutMs: number = 2500): number {
        camModeNumber()
        let t = 0
        let last = 0
        let hits = 0

        while (t < timeoutMs) {
            updateCamera()

            if (wondercam.MaxConfidenceOfNumber() >= 0.4) {
                const n = wondercam.NumberWithMaxConfidence()

                // général : accepte 1..9 (tu peux limiter à 1..5 si tu veux)
                if (n >= 1 && n <= 9) {
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

    // -------------------------
    // ALIAS CACHÉS (compat)
    // -------------------------
    //% blockHidden=1
    //% deprecated=1
    export function readAprilTagAB(tagA: number = 1, tagB: number = 2, timeoutMs: number = 6000): number {
        return detectAprilTagAB(tagA, tagB, timeoutMs)
    }

    //% blockHidden=1
    //% deprecated=1
    export function readNumberStable(timeoutMs: number = 2500): number {
        return detectNumberStable(timeoutMs)
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
    // MISSION (AI Handler)
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

    //% blockId=msm_beep_validation
    //% block="bip validation"
    //% group="Mission"
    export function beepValidation(): void {
        music.play(music.tonePlayable(262, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    }

    /**
     * ✅ ACTION : approcher & attraper une couleur ID (AI Handler)
     */
    //% blockId=msm_approach_grab_color
    //% block="approcher & attraper couleur ID %id"
    //% id.min=1 id.max=7 id.defl=1
    //% group="Mission"
    export function approachAndGrabIfColor(id: number): void {
        lastGrab = false

        if (phase != 0) return

        if (!wondercam.isDetectedColorId(id)) {
            nextCount = 0
            return
        }

        const x = wondercam.XOfColorId(wondercam.Options.Pos_X, id)
        if (x < X_MIN || x > X_MAX) {
            nextCount = 0
            return
        }

        nextCount += 1
        if (nextCount <= VALIDATIONS) return

        nextCount = 0
        beepValidation()

        while (wondercam.isDetectedColorId(id) &&
            wondercam.XOfColorId(wondercam.Options.Pos_Y, id) < Y_CLOSE) {
            updateCamera()
            updateLineSensors()
            lineFollowGeneral()
        }

        grab()
        lastGrab = true
    }

    // =========================================================
    // SMART TRANSPORT (encore plus blocs)
    // =========================================================
    // 0=T1, 1=BP0, 2=T2, 3=BP1, 4=BP2, 99=FIN
    let st_barIndex = 0
    let st_pathAB = -1
    let st_target = 0

    let st_barHighMs = 0
    let st_cooldownUntil = 0
    let st_barLatched = false
    let st_barArmed = true

    let st_lastDisp = ""

    // params Smart Transport
    let ST_TAG_A = 1
    let ST_TAG_B = 2
    let ST_TURN_LEFT_90_MS = 1200
    let ST_BACK_MS = 1000
    let ST_BP0_TURN_MS = 240
    let ST_LOOP_MS = 20
    let ST_BAR_HOLD_MS = 30
    let ST_BAR_COOLDOWN_MS = 220

    let ST_SERVO_PORT = 6
    let ST_DROP_ANG = -100
    let ST_REST_ANG = -20
    let ST_DROP_MS = 200
    let ST_REST_MS = 500
    let ST_HOLD_MS = 2000

    let ST_V_TURN = 100
    let ST_V_SLOW = 32
    let ST_V_MED = 42

    function stDisp(ch: string) {
        if (ch == st_lastDisp) return
        st_lastDisp = ch
        basic.clearScreen()
        basic.showString(ch)
    }

    function stResetCooldown(ms: number) {
        st_barHighMs = 0
        st_barLatched = false
        st_cooldownUntil = control.millis() + ms
    }

    function stRearmIfLeftBar() {
        if (blackCount() <= 2) st_barArmed = true
    }

    function stBarHit(): boolean {
        const now = control.millis()
        if (now < st_cooldownUntil) return false
        if (!st_barArmed) return false

        const high = blackCount() >= 3
        if (high) st_barHighMs += ST_LOOP_MS
        else st_barHighMs = 0

        if ((onBar3Plus() || st_barHighMs >= ST_BAR_HOLD_MS) && !st_barLatched) {
            st_barLatched = true
            st_cooldownUntil = now + ST_BAR_COOLDOWN_MS
            st_barArmed = false
            return true
        }

        if (!high) st_barLatched = false
        return false
    }

    function stLeaveBarShort() {
        let t = 0
        while (t < 320) {
            updateLineSensors()
            if (blackCount() <= 2) break
            forward(ST_V_SLOW)
            basic.pause(15)
            t += 15
        }
        stop()
    }

    function stLeaveT2Clear() {
        forward(ST_V_SLOW)
        basic.pause(350)
        stop()
        stResetCooldown(700)
        st_barArmed = false
    }

    function stBack1s() {
        backward(ST_V_SLOW)
        basic.pause(ST_BACK_MS)
        stop()
    }

    function stTurnLeft90() {
        forward(ST_V_SLOW)
        basic.pause(140)
        stop()
        basic.pause(50)

        pivotLeft(ST_V_TURN)
        basic.pause(ST_TURN_LEFT_90_MS)
        stop()
    }

    function stTurnAtBP0() {
        if (st_pathAB == ST_TAG_A) {
            pivotLeft(ST_V_MED)
            basic.pause(ST_BP0_TURN_MS)
        } else {
            pivotRight(ST_V_MED)
            basic.pause(ST_BP0_TURN_MS)
        }
        stop()
    }

    /**
     * Configure Smart Transport (tous paramètres importants)
     */
    //% blockId=msm_st_config
    //% block="configurer Smart Transport tagA %tagA tagB %tagB virage90 %turn90ms ms recul %backMs ms BP0 %bp0ms ms loop %loopMs ms hold %holdMs ms cooldown %cooldownMs ms servo %servoPort drop %dropAng rest %restAng dropMs %dropMs restMs %restMs holdOpen %holdOpenMs"
    //% tagA.defl=1 tagB.defl=2
    //% turn90ms.defl=1200 backMs.defl=1000 bp0ms.defl=240
    //% loopMs.defl=20 holdMs.defl=30 cooldownMs.defl=220
    //% servoPort.defl=6 dropAng.defl=-100 restAng.defl=-20 dropMs.defl=200 restMs.defl=500 holdOpenMs.defl=2000
    //% group="Smart Transport"
    export function smartTransportConfig(
        tagA: number,
        tagB: number,
        turn90ms: number,
        backMs: number,
        bp0ms: number,
        loopMs: number,
        holdMs: number,
        cooldownMs: number,
        servoPort: number,
        dropAng: number,
        restAng: number,
        dropMs: number,
        restMs: number,
        holdOpenMs: number
    ): void {
        ST_TAG_A = tagA
        ST_TAG_B = tagB
        ST_TURN_LEFT_90_MS = turn90ms
        ST_BACK_MS = backMs
        ST_BP0_TURN_MS = bp0ms
        ST_LOOP_MS = loopMs
        ST_BAR_HOLD_MS = holdMs
        ST_BAR_COOLDOWN_MS = cooldownMs

        ST_SERVO_PORT = servoPort
        ST_DROP_ANG = dropAng
        ST_REST_ANG = restAng
        ST_DROP_MS = dropMs
        ST_REST_MS = restMs
        ST_HOLD_MS = holdOpenMs
    }

    /**
     * Réinitialiser Smart Transport
     */
    //% blockId=msm_st_reset
    //% block="réinitialiser Smart Transport"
    //% group="Smart Transport"
    export function smartTransportReset(): void {
        st_barIndex = 0
        st_pathAB = -1
        st_target = 0

        st_barHighMs = 0
        st_cooldownUntil = 0
        st_barLatched = false
        st_barArmed = true

        st_lastDisp = ""
        basic.clearScreen()
    }

    /**
     * Étape Smart Transport (à appeler dans forever)
     * T1 -> BP0 -> T2 -> BP1/BP2 -> Dépôt -> FIN
     */
    //% blockId=msm_st_step
    //% block="étape Smart Transport"
    //% group="Smart Transport"
    export function smartTransportStep(): void {
        updateLineSensors()
        stRearmIfLeftBar()

        // T1 : lire tag A/B sur barre
        if (st_barIndex == 0 && st_pathAB == -1) {
            stop()
            if (onBar3Plus()) {
                const id = detectAprilTagAB(ST_TAG_A, ST_TAG_B, 6000)
                if (id == ST_TAG_A || id == ST_TAG_B) {
                    st_pathAB = id
                    stDisp(id == ST_TAG_A ? "A" : "B")
                    basic.pause(200)
                    stLeaveBarShort()
                    stResetCooldown(240)
                    st_barIndex = 1
                }
            }
            basic.pause(ST_LOOP_MS)
            return
        }

        // fin
        if (st_barIndex == 99) {
            stop()
            basic.pause(ST_LOOP_MS)
            return
        }

        // suivi ligne
        lineFollowGeneral()

        // barre suivante
        if (!stBarHit()) {
            basic.pause(ST_LOOP_MS)
            return
        }

        stop()
        basic.pause(220)

        // BP0
        if (st_barIndex == 1) {
            stTurnAtBP0()
            stLeaveBarShort()
            stResetCooldown(240)
            st_barIndex = 2
            return
        }

        // T2 : lire chiffre (stable)
        if (st_barIndex == 2) {
            st_target = detectNumberStable(2500)
            stDisp(st_target + "")
            basic.pause(200)
            stLeaveT2Clear()
            st_barIndex = 3
            return
        }

        // BP1
        if (st_barIndex == 3) {
            if (st_target == 1) {
                stTurnLeft90()
                stBack1s()
                dropByServo270(ST_SERVO_PORT, ST_DROP_ANG, ST_REST_ANG, ST_DROP_MS, ST_REST_MS, ST_HOLD_MS)
                st_barIndex = 99
            } else {
                stLeaveBarShort()
                stResetCooldown(260)
                st_barIndex = 4
            }
            return
        }

        // BP2
        if (st_barIndex == 4) {
            if (st_target == 2) {
                stTurnLeft90()
                stBack1s()
                dropByServo270(ST_SERVO_PORT, ST_DROP_ANG, ST_REST_ANG, ST_DROP_MS, ST_REST_MS, ST_HOLD_MS)
            }
            st_barIndex = 99
            return
        }
    }

    /**
     * Smart Transport terminé ?
     */
    //% blockId=msm_st_done
    //% block="Smart Transport terminé ?"
    //% group="Smart Transport"
    export function smartTransportDone(): boolean {
        return st_barIndex == 99
    }
}
