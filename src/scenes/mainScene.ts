import p5 from "p5";
import type { Scene } from "../interfaces/Scene";
import type { ParameterStore } from "../core/parameterStore";
import type { Movement } from "../interfaces/Movement";
import { getMovementById } from "../movements";
import { ensureFontLoaded, getFontById, getP5FontById, type FontId } from "../core/fontRegistry";

// SampleScene はテンプレート用の最小シーン実装を提供する。
export class SampleScene implements Scene {
    private displayedMessage: string;
    private pendingMessage: { text: string; bpm: number; movementId: string; fontId: FontId } | null;
    private latestMessageVersion: number;

    // movement tempo (beats per minute)
    private activeMovementBpm = 120;
    private activeMovementId = "fade";
    private activeFontId: FontId;
    private requestedFontId: FontId;

    // when the current movement animation started (used to compute movement beats)
    private movementStart = Number.NEGATIVE_INFINITY;

    constructor(parameterStore: ParameterStore) {
        const initialState = parameterStore.getState();
        this.displayedMessage = initialState.message;
        this.latestMessageVersion = initialState.messageVersion;
        this.pendingMessage = null;
        this.activeMovementBpm = Math.max(1, initialState.tempoBpm);
        this.activeMovementId = initialState.movementId;
        this.activeFontId = initialState.fontId;
        this.requestedFontId = initialState.fontId;

        void ensureFontLoaded(getFontById(this.activeFontId));

        parameterStore.subscribe((state) => {
            const nextTempoBpm = Math.max(1, state.tempoBpm);
            const nextFontId = state.fontId;
            if (this.requestedFontId !== nextFontId) {
                this.requestedFontId = nextFontId;
                void ensureFontLoaded(getFontById(this.requestedFontId));
            }

            const nextMessageVersion = state.messageVersion;

            if (this.latestMessageVersion !== nextMessageVersion) {
                this.latestMessageVersion = nextMessageVersion;
                this.pendingMessage = {
                    text: state.message,
                    bpm: nextTempoBpm,
                    movementId: state.movementId,
                    fontId: this.requestedFontId,
                };
                return;
            }

            const tempoChanged = this.activeMovementBpm !== nextTempoBpm;
            const movementChanged = this.activeMovementId !== state.movementId;

            if (tempoChanged || movementChanged) {
                this.pendingMessage = {
                    text: this.displayedMessage,
                    bpm: nextTempoBpm,
                    movementId: state.movementId,
                    fontId: this.requestedFontId,
                };
            }
        });
    }

    // update はこのシーン固有のアニメーションや入力処理を記述する場所。
    update(p: p5): void {
        const now = p.millis();

        // Apply pending message immediately when present.
        if (this.pendingMessage) {
            this.displayedMessage = this.pendingMessage.text;
            this.activeMovementBpm = this.pendingMessage.bpm;
            this.activeMovementId = this.pendingMessage.movementId;
            this.activeFontId = this.pendingMessage.fontId;
            void ensureFontLoaded(getFontById(this.activeFontId));
            this.pendingMessage = null;
            this.movementStart = now;
        }

        if (this.movementStart === Number.NEGATIVE_INFINITY) {
            this.movementStart = now;
        }
    }

    // draw は受け取った Graphics にシーンのビジュアルを描画する。
    draw(p: p5, tex: p5.Graphics, movement: Movement): void {
        tex.push();
        tex.clear(0, 0, 0, 0);

        const now = p.millis();
        // movement beats are based on movementStart and the active BPM
        const movementElapsed = this.movementStart === Number.NEGATIVE_INFINITY ? 0 : now - this.movementStart;
        const beatsElapsed = this.activeMovementBpm > 0
            ? movementElapsed / (60000 / this.activeMovementBpm)
            : 0;

        const movementToUse = movement.id === this.activeMovementId
            ? movement
            : getMovementById(this.activeMovementId);

        const font = getFontById(this.activeFontId);
        const p5Font = getP5FontById(this.activeFontId);
        if (p5Font) {
            tex.textFont(p5Font);
        } else {
            tex.textFont(font.family);
        }

        try {
            movementToUse.draw({
                p,
                tex,
                message: this.displayedMessage,
                elapsedMs: movementElapsed,
                bpm: this.activeMovementBpm,
                beatsElapsed,
            });
        } catch (error) {
            console.warn("Movement draw failed", error);
            const fallback = getMovementById("fade");
            fallback.draw({
                p,
                tex,
                message: this.displayedMessage,
                elapsedMs: movementElapsed,
                bpm: this.activeMovementBpm,
                beatsElapsed,
            });
        }

        tex.pop();
    }
}