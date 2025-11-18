import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";
import { VertText } from "../../utils/vertText";

export class TypeWriteMovement implements Movement {
  readonly id = "TypeWrite";
  readonly label = "タイプ";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = [...message]
    const beatPhase = Math.max(0, beatsElapsed);
    const clamped = Math.min(1, beatPhase);
    const scaled = Easing.easeInQuad(clamped) + (Math.max(1, beatPhase) - 1) * 0.5;
    const maxSize = (tex.height - Math.min(tex.width, tex.height) * 0.1 * 2) / (Math.max(message.length, 10) * 1.2) ;

    tex.push();
    tex.textAlign(p.CENTER, p.CENTER);
    tex.translate(tex.width/2, tex.height/2);
    for(let i = 0; i < safeMessage.length; i++){
      const char = safeMessage[i];
      if(i / safeMessage.length <= clamped){
        tex.push();
        tex.textSize(maxSize);
        tex.fill(255, Math.min(scaled * 255, 255));
        tex.noStroke();
        tex.text(char, (i - (safeMessage.length - 1) / 2) * maxSize * 1.1, 0);
        tex.pop();
      }
    }
    tex.pop();
  }
}
