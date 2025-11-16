import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class ScalePopMovement implements Movement {
  readonly id = "scalePop";
  readonly label = "拡大ポップ";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const eased = Easing.easeOutBack(Math.min(1, Math.max(0, progress)));
    const fade = Easing.easeInOutSine(Math.min(1, Math.max(0, progress)));

    const maxSize = Math.min(tex.width, tex.height);
    const baseSize = maxSize * 0.08;
    const scale = 0.4 + eased * 0.8;

    tex.push();
    tex.translate(tex.width / 2, tex.height / 2);
    tex.scale(scale, scale);

    tex.noStroke();
    tex.fill(255, 255, 255, Math.floor(255 * fade));
    tex.textAlign(p.LEFT, p.TOP);
    tex.textSize(baseSize / scale);
    tex.textLeading((baseSize / scale) * 1.1);
    tex.textWrap(p.WORD);

    const virtualWidth = (tex.width / scale) * 0.7;
    const virtualHeight = (tex.height / scale) * 0.7;

    tex.text(safeMessage, -virtualWidth / 2, -virtualHeight / 2, virtualWidth, virtualHeight);
    tex.pop();
  }
}
