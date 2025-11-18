import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class CenterUpRotateMovement implements Movement {
  readonly id = "CenterUpRotate";
  readonly label = "中央上回転";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = [...message];
    const beatPhase = Math.max(0, beatsElapsed);
    const clamped = Math.min(1, beatPhase);
    const maxSize = tex.width / Math.max((message.length * 1.5), 10);
    const positionY = (tex.height * 0.5 + maxSize * 2.0)-Easing.easeInQuad(clamped) * (tex.height * 0.5 + maxSize * 2.0);
    const angle = p.map(Easing.easeOutBounce(clamped), 0, 1, p.PI, 0);
    const sclX = 0.2 + 0.8 * Easing.easeOutHarshBounce(clamped);
    const sclY = 0.2 + 0.8 * Easing.easeOutSlightBounce(clamped);

    tex.push();
    tex.translate(tex.width / 2, tex.height / 2);
    tex.translate(0, positionY);
    tex.textAlign(p.CENTER, p.CENTER);
    tex.textSize(maxSize);
    for(let i = 0; i < safeMessage.length; i++){
      const x = (i - (safeMessage.length - 1) / 2) * maxSize * 1.1;

      tex.push();
      tex.translate(x, 0);
      tex.scale(sclX, sclY);
      tex.rotate(0);

      tex.push();
      tex.fill(30, 200);
      tex.translate(maxSize * 0.1, maxSize * 0.1);
      tex.text(safeMessage[i], 0, 0);
      tex.pop();

      tex.stroke(255);
      tex.strokeWeight(maxSize * 0.1);
      tex.fill(10);
      tex.text(safeMessage[i], 0, 0);
      tex.pop();
    }
    tex.pop();
  }
}