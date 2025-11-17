import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";
import { VertText } from "../../utils/vertText";

export class TwoBoxMovement implements Movement {
  readonly id = "TwoBox";
  readonly label = "2箱表示";

  private array: {x: number, y: number, message:string}[] = [];
  private direction: number = 1;
  private startAngle: number = (Math.random() - 0.5) * 0.35 * Math.PI;
  private targetAngle: number = (Math.random() - 0.5) * 0.35 * Math.PI;

  onLyricChange(payload: { message: string; lyricIndex: number; }): void {
    this.array.push({x: (Math.random() * 0.5 + 0.5) * this.direction, y: (Math.random() - 0.5) * 2.0, message: payload.message});
    if(this.array.length > 2) {
      this.array.shift();
    }
    this.direction *= -1;

    this.startAngle = this.targetAngle;
    this.targetAngle = (Math.random() - 0.5) * 0.35 * Math.PI;
  }

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    const beatPhase = Math.max(0, beatsElapsed);
    const clamped = Math.min(1, beatPhase);
    const scaled = Easing.easeInQuad(clamped) + (Math.max(1, beatPhase) - 1) * 0.5;
    const maxSize = Math.min(tex.width, tex.height) * 0.1 * 2;
    const angle = p.map(Easing.easeOutQuad(clamped), 0, 1, this.startAngle, this.targetAngle);

    tex.push();
    tex.translate(tex.width/2, tex.height/2);
    tex.textSize(maxSize);
    tex.rotate(angle);

    for (let i = 0; i < this.array.length; i++) {
      const x = this.array[i]?.x * tex.width * 0.4;
      const y = this.array[i]?.y * tex.height * 0.4;
      const message = this.array[i]?.message;
      const alpha = i == this.array.length -1 ? Math.min(scaled, 1) : 1;
      const rectWidth = tex.textWidth("W") * 1.5;
      const rectHeight = tex.textWidth("W") * message.length * 1.2;

      tex.push();
      tex.translate(x, y);

      tex.noFill();
      tex.stroke(Math.min(alpha * 255, 255));
      tex.rectMode(p.CENTER);
      tex.rect(0, 0, rectWidth, rectHeight);

      tex.fill(255, Math.min(alpha * 255, 255));
      tex.noStroke();
      VertText.vertText(p, tex, message || "", 0, 0, "CENTER");
      tex.pop();
    }
    tex.pop();
  }
}
