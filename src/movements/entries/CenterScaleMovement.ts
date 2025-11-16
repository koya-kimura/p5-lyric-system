import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class CenterScaleMovement implements Movement {
  readonly id = "CenterScale";
  readonly label = "中央拡大";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = message || "";
    const beatPhase = Math.max(0, beatsElapsed);
    const clamped = Math.min(1, beatPhase);
    const scaled = Easing.easeInQuad(clamped) + (Math.max(1, beatPhase) - 1);
    const maxSize = tex.width / Math.max((message.length * 2), 14);

    tex.push();
    tex.noStroke();
    tex.fill(255, Math.floor(255 * clamped));
    tex.textAlign(p.CENTER, p.CENTER);
    tex.textSize(maxSize + scaled * maxSize * 0.1);
    tex.text(safeMessage, tex.width / 2, tex.height / 2);
    tex.pop();
  }
}