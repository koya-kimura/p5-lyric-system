import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";
import { VertText } from "../../utils/vertText";

export class VerticalTextDisplay implements Movement {
  readonly id = "VerticalText";
  readonly label = "縦書き表示";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = message || "";
    const beatPhase = Math.max(0, beatsElapsed);
    const clamped = Math.min(1, beatPhase);
    const scaled = Easing.easeInQuad(clamped) + (Math.max(1, beatPhase) - 1) * 0.5;
    const maxSize = tex.height / (Math.max(message.length, 10) * 1.35) ;

    tex.push();
    tex.textAlign(p.CENTER, p.CENTER);
    tex.translate(tex.width - Math.min(tex.width, tex.height) * 0.1, Math.min(tex.width, tex.height) * 0.1);

    tex.textSize(maxSize);
    tex.fill(255, Math.min(scaled * 255, 255));
    tex.noStroke();
    VertText.vertText(tex, safeMessage, 0, 0);
    tex.pop();
  }
}
