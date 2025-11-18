import type { Movement, MovementContext } from "../../interfaces/Movement";
// import { Easing } from "../../utils/easing";
import { UniformRandom } from "../../utils/uniformRandom";
import { CharacterChecker } from "../../utils/characterChecker";

export class PopTextMovement implements Movement {
  readonly id = "PopText";
  readonly label = "ポップ";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = [...message]
    const beatPhase = Math.max(0, beatsElapsed);
    // const clamped = Math.min(1, beatPhase);
    const maxSize = (tex.height - Math.min(tex.width, tex.height) * 0.1 * 2) / (Math.max(message.length, 5) * 0.9) ;

    tex.push();
    tex.textAlign(p.CENTER, p.BOTTOM);
    tex.translate(tex.width/2, tex.height/2);
    for(let i = 0; i < safeMessage.length; i++){
      const char = safeMessage[i];
      const scale = (Math.pow(UniformRandom.uniformRandom(i, UniformRandom.text2Seed(message)), 2) * 0.1 + (CharacterChecker.isKanji(char) ? 0.8 : 0.6));
      const angle = p.map(UniformRandom.uniformRandom(i, UniformRandom.text2Seed(message)), 0, 1, p.PI/25, p.PI/15) * (i%2==0 ? 1 : -1);

      tex.push();
      tex.fill(255);
      tex.textSize(maxSize);
      tex.translate((i - (safeMessage.length - 1) / 2) * maxSize * 0.6, 0);
      tex.rotate(angle);
      tex.scale(scale);
      tex.text(char, 0, 0);
      tex.pop();
    }
    tex.pop();
  }
}
