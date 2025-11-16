import type { Movement, MovementContext } from "../../interfaces/Movement";

export class RightFadeMovement implements Movement {
  readonly id = "rightFade";
  readonly label = "右フェード";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const maxSize = Math.min(tex.width, tex.height);
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const eased = clampedProgress <= 0 ? 0 : Math.pow(clampedProgress, 0.85);

    const startX = tex.width + maxSize * 0.35;
    const targetX = tex.width / 2;
    const currentX = startX + (targetX - startX) * eased;
    const textAlpha = Math.floor(255 * clampedProgress);
    const textOffset = tex.width * 0.12 * (1 - eased);

    tex.push();
    tex.noStroke();
    tex.fill(255, 255, 255, textAlpha);
    tex.textAlign(p.CENTER, p.CENTER);
    tex.textSize(maxSize * 0.08);
    tex.textLeading(maxSize * 0.09);
    tex.textWrap(p.WORD);
    tex.text(safeMessage, currentX - textOffset, tex.height / 2, tex.width * 0.7, tex.height * 0.7);
    tex.pop();
  }
}
