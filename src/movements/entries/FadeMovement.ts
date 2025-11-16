import type { Movement, MovementContext } from "../../interfaces/Movement";

export class FadeMovement implements Movement {
  readonly id = "fade";
  readonly label = "中央フェード";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const maxSize = Math.min(tex.width, tex.height);
    const textAlpha = Math.floor(255 * clampedProgress);
    const boxWidth = tex.width * 0.7;
    const boxHeight = tex.height * 0.7;

    tex.push();
    tex.noStroke();
    tex.fill(255, 255, 255, textAlpha);
    tex.textAlign(p.LEFT, p.TOP);
    tex.textSize(maxSize * 0.08);
    tex.textLeading(maxSize * 0.09);
    tex.textWrap(p.WORD);
    tex.translate(tex.width / 2, tex.height / 2);
    tex.text(safeMessage, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
    tex.pop();
  }
}
