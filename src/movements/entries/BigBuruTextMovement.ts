import type { Movement, MovementContext } from "../../interfaces/Movement";
import { UniformRandom } from "../../utils/uniformRandom";

export class BigBuruTextMovement implements Movement {
  readonly id = "BigBuruText";
  readonly label = "デカ文字";

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const safeMessage = [...message]
    // const clamped = Math.min(1, beatPhase);
    const maxSize = Math.min((tex.width / safeMessage.length), tex.height / 3) * 1.2;

    if (safeMessage.length === 0) {
      return;
    }

    tex.push();
    tex.background(255, 240);
    tex.textAlign(p.CENTER, p.CENTER);
    for (let i = 0; i < safeMessage.length; i++) {
      for (let j = 0; j < 3; j++) {
        const char = safeMessage[i];
        const x = tex.width / safeMessage.length * (i + 0.5);
        const y = tex.height / 3 * (j + 0.5);
        const scl = 1 + UniformRandom.uniformRandom(i, j, Math.floor(beatsElapsed * 8)) * 0.2
        const angle = p.map(UniformRandom.uniformRandom(i * 4701, j * 7897, Math.floor(beatsElapsed * 4)), 0, 1, -0.1, 0.1) * Math.PI;

        tex.push();
        tex.textSize(maxSize);
        tex.translate(x, y);
        tex.scale(scl, scl);
        tex.rotate(angle);
        tex.fill(0, 255, 0);
        tex.noStroke();
        tex.text(char, 0, 0);
        tex.pop();
      }
    }
    tex.pop();
  }
}
