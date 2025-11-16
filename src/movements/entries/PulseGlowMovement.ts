import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class PulseGlowMovement implements Movement {
  readonly id = "pulseGlow";
  readonly label = "グロウ鼓動";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const clamped = Math.min(1, Math.max(0, progress));
    const eased = Easing.easeOutSine(clamped);
    const pulse = 0.9 + 0.1 * Math.sin(clamped * Math.PI);
    const alpha = Math.floor(255 * eased);

    const maxSize = Math.min(tex.width, tex.height);
    const textSize = maxSize * 0.08 * pulse;

    tex.push();
    const ctx = tex.drawingContext as CanvasRenderingContext2D;
    ctx.save();
    ctx.shadowColor = `rgba(255, 255, 255, ${0.35 * eased})`;
    ctx.shadowBlur = 40 * eased;

    tex.noStroke();
    tex.fill(255, 255, 255, alpha);
    tex.textAlign(p.LEFT, p.TOP);
    tex.textSize(textSize);
    tex.textLeading(textSize * 1.1);
    tex.textWrap(p.WORD);

    const boxWidth = tex.width * 0.7;
    const boxHeight = tex.height * 0.7;

    tex.translate(tex.width / 2, tex.height / 2);
    tex.text(safeMessage, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);

    ctx.restore();
    tex.pop();
  }
}
