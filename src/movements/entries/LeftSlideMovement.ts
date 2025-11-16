import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class LeftSlideMovement implements Movement {
  readonly id = "leftSlide";
  readonly label = "左スライド";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const eased = Easing.easeOutCubic(Math.min(1, Math.max(0, progress)));
    const fade = Easing.easeOutSine(Math.min(1, Math.max(0, progress)));

    const maxSize = Math.min(tex.width, tex.height);
    const margin = tex.width * 0.05;
    const boxWidth = Math.min(tex.width * 0.65, tex.width - margin * 2);
    const boxHeight = tex.height * 0.7;
    const finalLeft = margin;
    const startOffset = tex.width * 0.45;
    const currentLeft = finalLeft - (1 - eased) * startOffset;
    const currentTop = tex.height / 2 - boxHeight / 2;

    tex.push();
    tex.noStroke();
    tex.fill(255, 255, 255, Math.floor(255 * fade));
    tex.textAlign(p.LEFT, p.TOP);
    tex.textSize(maxSize * 0.08);
    tex.textLeading(maxSize * 0.09);
    tex.textWrap(p.WORD);
    tex.text(safeMessage, currentLeft, currentTop, boxWidth, boxHeight);
    tex.pop();
  }
}
