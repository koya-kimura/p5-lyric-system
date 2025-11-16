import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class UpSlideMovement implements Movement {
  readonly id = "upSlide";
  readonly label = "上スライド";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const eased = Easing.easeOutCubic(Math.min(1, Math.max(0, progress)));
    const fade = Easing.easeOutSine(Math.min(1, Math.max(0, progress)));

    const maxSize = Math.min(tex.width, tex.height);
    const marginY = tex.height * 0.05;
    const boxWidth = tex.width * 0.7;
    const boxHeight = tex.height * 0.7;
    const finalTop = marginY + (tex.height - marginY * 2 - boxHeight) / 2;
    const startOffset = tex.height * 0.5;
    const currentTop = finalTop - (1 - eased) * startOffset;
    const currentLeft = tex.width / 2 - boxWidth / 2;

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
