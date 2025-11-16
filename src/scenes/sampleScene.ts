import p5 from "p5";
import type { Scene } from "../interfaces/Scene";
import type { ParameterStore } from "../core/parameterStore";
import type { Movement } from "../interfaces/Movement";
import { getMovementById } from "../movements";

// SampleScene はテンプレート用の最小シーン実装を提供する。
export class SampleScene implements Scene {
    private displayedMessage: string;
    private pendingMessage: { text: string; duration: number; movementId: string } | null;
    private latestMessage: string;
    
    // movement animation timing (ms)
    private activeMovementDuration = 1000;
    private activeMovementId = "fade";

    // transition state for swap between messages
    private transition: "idle" | "fadeOut" | "fadeIn" = "idle";
    private transitionStart = Number.NEGATIVE_INFINITY;
    private readonly transitionOutMs = 200; // 0.2s fade-out
    private readonly transitionInMs = 200; // 0.2s fade-in
    // when the current movement animation started (used to compute movement progress)
    private movementStart = Number.NEGATIVE_INFINITY;

    constructor(parameterStore: ParameterStore) {
        const initialState = parameterStore.getState();
        this.displayedMessage = initialState.message;
        this.latestMessage = initialState.message;
        this.pendingMessage = null;
        this.activeMovementDuration = Math.max(0, initialState.fadeDurationMs);
        this.activeMovementId = initialState.movementId;

        parameterStore.subscribe((state) => {
            const nextFadeDuration = Math.max(0, state.fadeDurationMs);

            if (this.latestMessage !== state.message) {
                this.latestMessage = state.message;
                this.pendingMessage = {
                    text: state.message,
                    duration: nextFadeDuration,
                    movementId: state.movementId,
                };
                return;
            }

            if (this.activeMovementDuration !== nextFadeDuration) {
                this.pendingMessage = {
                    text: this.displayedMessage,
                    duration: nextFadeDuration,
                    movementId: this.activeMovementId,
                };
            }
        });
    }

    // update はこのシーン固有のアニメーションや入力処理を記述する場所。
    update(p: p5): void {
        const now = p.millis();

        // If there is a pending message and we're idle, start fade-out
        if (this.pendingMessage !== null && this.transition === "idle") {
            this.transition = "fadeOut";
            this.transitionStart = now;
            return;
        }

        if (this.transition === "fadeOut") {
            const elapsed = now - this.transitionStart;
            if (elapsed >= this.transitionOutMs) {
                // swap messages: previous fully faded out
                this.displayedMessage = this.pendingMessage ? this.pendingMessage.text : this.displayedMessage;
                if (this.pendingMessage) {
                    this.activeMovementDuration = this.pendingMessage.duration;
                    this.activeMovementId = this.pendingMessage.movementId;
                }
                this.pendingMessage = null;
                // start fade-in
                this.transition = "fadeIn";
                this.transitionStart = now;
                // start movement animation from zero
                this.movementStart = now;
            }
            return;
        }

        if (this.transition === "fadeIn") {
            const elapsed = now - this.transitionStart;
            if (elapsed >= this.transitionInMs) {
                this.transition = "idle";
                this.transitionStart = Number.NEGATIVE_INFINITY;
            }
            return;
        }

        // idle: ensure movementStart is set so movement progress can run
        if (this.transition === "idle" && this.movementStart === Number.NEGATIVE_INFINITY) {
            this.movementStart = now;
        }
    }

    // draw は受け取った Graphics にシーンのビジュアルを描画する。
    draw(p: p5, tex: p5.Graphics, movement: Movement): void {
        tex.push();
        tex.clear(0, 0, 0, 0);

        // compute baseAlpha based on transition state (fadeOut -> fadeIn)
        const now = p.millis();
        let baseAlpha = 1;
        if (this.transition === "fadeOut") {
            const elapsed = now - this.transitionStart;
            baseAlpha = 1 - Math.min(1, Math.max(0, elapsed / this.transitionOutMs));
        } else if (this.transition === "fadeIn") {
            const elapsed = now - this.transitionStart;
            baseAlpha = Math.min(1, Math.max(0, elapsed / this.transitionInMs));
        } else {
            baseAlpha = 1;
        }

        // movement progress is based on movementStart and activeMovementDuration
        const movementElapsed = this.movementStart === Number.NEGATIVE_INFINITY ? 0 : now - this.movementStart;
        const progress = this.activeMovementDuration > 0
            ? Math.min(1, Math.max(0, movementElapsed / this.activeMovementDuration))
            : 1;

        const movementToUse = movement.id === this.activeMovementId
            ? movement
            : getMovementById(this.activeMovementId);

        // apply base alpha globally so each movement stays simple
        const ctx = tex.drawingContext as CanvasRenderingContext2D;
        const originalAlpha = ctx.globalAlpha;
        const clampedAlpha = Math.min(1, Math.max(0, baseAlpha));

        const applyAlpha = () => {
            ctx.globalAlpha = originalAlpha * clampedAlpha;
        };

        const restoreAlpha = () => {
            ctx.globalAlpha = originalAlpha;
        };

        applyAlpha();
        try {
            movementToUse.draw({
                p,
                tex,
                message: this.displayedMessage,
                elapsedMs: movementElapsed,
                durationMs: this.activeMovementDuration,
                progress,
            });
        } catch (error) {
            console.warn("Movement draw failed", error);
            const fallback = getMovementById("fade");
            applyAlpha();
            fallback.draw({
                p,
                tex,
                message: this.displayedMessage,
                elapsedMs: movementElapsed,
                durationMs: this.activeMovementDuration,
                progress,
            });
        } finally {
            restoreAlpha();
        }

        tex.pop();
    }
}