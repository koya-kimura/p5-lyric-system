import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";
import { SpaceText } from "../../utils/spaceText";

export class VerticalMovement implements Movement {
  readonly id = "Vertical";
  readonly label = "縦移動";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = message || "";
    const beatPhase = Math.max(0, beatsElapsed) * 0.5;
    const clamped = Math.min(1, beatPhase);
    const scaled = Easing.easeInQuad(clamped) + (Math.max(1, beatPhase) - 1) * 0.5;
    const maxSize = tex.height / (message.length * 1.5);

    tex.push();
    tex.textAlign(p.CENTER, p.CENTER);
    tex.translate(tex.width / 2, tex.height / 2);
    tex.rotate(p.HALF_PI);

    tex.textSize(maxSize*5);
    tex.stroke(255, 150);
    tex.noFill();
    tex.text(safeMessage, 0, 0);

    tex.textSize(maxSize);
    tex.fill(255, Math.min(scaled * 200, 255));
    tex.noStroke();
    SpaceText.spaceText(tex, safeMessage, 0, 0, scaled, "CENTER");
    tex.pop();
  }
}
