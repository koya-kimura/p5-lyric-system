import p5 from "p5";
import type { Scene } from "../interfaces/Scene";
import type { ParameterStore, DisplayMode } from "../core/parameterStore";
import type { Movement, MovementLyricPayload } from "../interfaces/Movement";
import { getMovementById } from "../movements";
import { ensureFontLoaded, getFontById, getP5FontById, type FontId } from "../core/fontRegistry";

// SampleScene はテンプレート用の最小シーン実装を提供する。
export class SampleScene implements Scene {
    private displayedMessage: string;
    private pendingMessage: { text: string; bpm: number; movementId: string; fontId: FontId; color: string; lyricIndex: number } | null;
    private latestMessageVersion: number;

    // movement tempo (beats per minute)
    private activeMovementBpm = 120;
    private activeMovementId = "fade";
    private activeFontId: FontId;
    private requestedFontId: FontId;
    private activeColor: string;
    private activeLyricIndex: number;
    private lyricChangeEvent: MovementLyricPayload | null;
    private activeDisplayMode: DisplayMode;
    private logoImage: p5.Image | null = null;
    private isLogoLoading = false;

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
        this.activeColor = initialState.color;
        this.activeLyricIndex = initialState.activeLyricIndex;
        this.lyricChangeEvent = null;
        this.activeDisplayMode = initialState.displayMode;

        void ensureFontLoaded(getFontById(this.activeFontId));

        parameterStore.subscribe((state) => {
            const nextTempoBpm = Math.max(1, state.tempoBpm);
            const nextFontId = state.fontId;
            if (this.requestedFontId !== nextFontId) {
                this.requestedFontId = nextFontId;
                void ensureFontLoaded(getFontById(this.requestedFontId));
            }

            if (this.activeFontId !== state.fontId) {
                this.activeFontId = state.fontId;
            }

            const nextMessageVersion = state.messageVersion;

            if (this.latestMessageVersion !== nextMessageVersion) {
                this.latestMessageVersion = nextMessageVersion;
                this.pendingMessage = {
                    text: state.message,
                    bpm: nextTempoBpm,
                    movementId: state.movementId,
                    fontId: this.requestedFontId,
                    color: state.color,
                    lyricIndex: state.activeLyricIndex,
                };
                return;
            }

            if (this.activeDisplayMode !== state.displayMode) {
                this.activeDisplayMode = state.displayMode;
                if (this.activeDisplayMode === "lyrics") {
                    this.pendingMessage = {
                        text: state.message,
                        bpm: nextTempoBpm,
                        movementId: state.movementId,
                        fontId: this.requestedFontId,
                        color: state.color,
                        lyricIndex: state.activeLyricIndex,
                    };
                }
                return;
            }

            if (this.activeColor !== state.color) {
                this.activeColor = state.color;
            }

            if (this.activeLyricIndex !== state.activeLyricIndex && state.activeLyricIndex < 0) {
                this.activeLyricIndex = state.activeLyricIndex;
            }
        });
    }

    // update はこのシーン固有のアニメーションや入力処理を記述する場所。
    update(p: p5): void {
        const now = p.millis();

        // Apply pending message immediately when present.
        if (this.pendingMessage) {
            const previousLyricIndex = this.activeLyricIndex;
            const previousMessage = this.displayedMessage;
            this.displayedMessage = this.pendingMessage.text;
            this.activeMovementBpm = this.pendingMessage.bpm;
            this.activeMovementId = this.pendingMessage.movementId;
            this.activeFontId = this.pendingMessage.fontId;
            this.activeColor = this.pendingMessage.color;
            this.activeLyricIndex = this.pendingMessage.lyricIndex;
            void ensureFontLoaded(getFontById(this.activeFontId));
            if (
                this.pendingMessage.lyricIndex >= 0
                && (this.pendingMessage.lyricIndex !== previousLyricIndex
                    || this.pendingMessage.text !== previousMessage)
            ) {
                this.lyricChangeEvent = {
                    message: this.pendingMessage.text,
                    lyricIndex: this.pendingMessage.lyricIndex,
                    fontId: this.pendingMessage.fontId,
                    color: this.pendingMessage.color,
                };
            } else {
                this.lyricChangeEvent = null;
            }
            this.pendingMessage = null;
            this.movementStart = now;
        }

        if (this.movementStart === Number.NEGATIVE_INFINITY) {
            this.movementStart = now;
        }

        if (this.activeDisplayMode === "logo" && !this.logoImage && !this.isLogoLoading) {
            this.loadLogoImage(p);
        }
    }

    // draw は受け取った Graphics にシーンのビジュアルを描画する。
    draw(p: p5, tex: p5.Graphics, movement: Movement): void {
        tex.push();
        tex.clear(0, 0, 0, 0);

        if (this.activeDisplayMode === "blank") {
            tex.pop();
            return;
        }

        if (this.activeDisplayMode === "logo") {
            this.drawLogo(tex);
            tex.pop();
            return;
        }

        const now = p.millis();
        // movement beats are based on movementStart and the active BPM
        const movementElapsed = this.movementStart === Number.NEGATIVE_INFINITY ? 0 : now - this.movementStart;
        const beatsElapsed = this.activeMovementBpm > 0
            ? movementElapsed / (60000 / this.activeMovementBpm)
            : 0;

        const movementToUse = movement.id === this.activeMovementId
            ? movement
            : getMovementById(this.activeMovementId);
        const lyricEvent = this.lyricChangeEvent;
        if (lyricEvent && typeof movementToUse.onLyricChange === "function") {
            movementToUse.onLyricChange({
                message: lyricEvent.message,
                lyricIndex: lyricEvent.lyricIndex,
                fontId: lyricEvent.fontId,
                color: lyricEvent.color,
            });
        }
        this.lyricChangeEvent = null;

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
                lyricIndex: this.activeLyricIndex,
                elapsedMs: movementElapsed,
                bpm: this.activeMovementBpm,
                beatsElapsed,
                fontId: this.activeFontId,
                color: this.activeColor,
            });
        } catch (error) {
            console.warn("Movement draw failed", error);
            const fallback = getMovementById("fade");
            if (lyricEvent && typeof fallback.onLyricChange === "function") {
                fallback.onLyricChange({
                    message: lyricEvent.message,
                    lyricIndex: lyricEvent.lyricIndex,
                    fontId: lyricEvent.fontId,
                    color: lyricEvent.color,
                });
            }
            fallback.draw({
                p,
                tex,
                message: this.displayedMessage,
                lyricIndex: this.activeLyricIndex,
                elapsedMs: movementElapsed,
                bpm: this.activeMovementBpm,
                beatsElapsed,
                fontId: this.activeFontId,
                color: this.activeColor,
            });
        }

        tex.pop();
    }

    private loadLogoImage(p: p5): void {
        this.isLogoLoading = true;
        p.loadImage(
            "/image/LiR-logo.png",
            (img) => {
                this.logoImage = img;
                this.isLogoLoading = false;
            },
            () => {
                this.isLogoLoading = false;
            },
        );
    }

    private drawLogo(tex: p5.Graphics): void {
        const image = this.logoImage;
        if (!image) {
            return;
        }

        const maxWidth = tex.width * 0.5;
        const aspect = image.height / Math.max(1, image.width);
        const targetWidth = maxWidth;
        const targetHeight = targetWidth * aspect;
        const x = (tex.width - targetWidth) / 2;
        const y = (tex.height - targetHeight) / 2;

        tex.image(image, x, y, targetWidth, targetHeight);
    }
}