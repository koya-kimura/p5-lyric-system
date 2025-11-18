import type { Movement, MovementContext, MovementLyricPayload } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";
import { VertText } from "../../utils/vertText";

export class TwoBoxMovement implements Movement {
  readonly id = "TwoBox";
  readonly label = "2箱表示";

  private array: {x: number, y: number, message:string}[] = [];
  private direction: number = 1;
  private startAngle: number = (Math.random() - 0.5) * 0.35 * Math.PI;
  private targetAngle: number = (Math.random() - 0.5) * 0.35 * Math.PI;

  onLyricChange(payload: MovementLyricPayload): void {
    this.array.push({x: (Math.random() * 0.5 + 0.5) * this.direction, y: (Math.random() - 0.5) * 2.0, message: payload.message});
    if(this.array.length > 2) {
      this.array.shift();
    }
    this.direction *= -1;

    this.startAngle = this.targetAngle;
    this.targetAngle = (Math.random() - 0.5) * 0.35 * Math.PI;
  }

  draw({ p, tex, message, beatsElapsed, color }: MovementContext): void {
    const beatPhase = Math.max(0, beatsElapsed);
    const clamped = Math.min(1, beatPhase);
    const scaled = Easing.easeInQuad(clamped) + (Math.max(1, beatPhase) - 1) * 0.5;
    const maxSize = Math.min(tex.width, tex.height) * 0.1 * 2;
    const angle = p.map(Easing.easeOutQuad(clamped), 0, 1, this.startAngle, this.targetAngle);

    tex.push();
    tex.translate(tex.width/2, tex.height/2);
    tex.textSize(maxSize);
    tex.rotate(angle);

    const fallback = (message && message.length > 0)
      ? [{ x: 0, y: 0, message }]
      : [];
    const entries = this.array.length > 0 ? this.array : fallback;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const x = entry?.x * tex.width * 0.4;
      const y = entry?.y * tex.height * 0.4;
      const entryMessage = entry?.message;
      const isNewestEntry = i === entries.length - 1;
      const alpha = isNewestEntry ? Math.min(scaled, 1) : 1;
      const rectWidth = tex.textWidth("W") * 1.5;
      const rectHeight = tex.textWidth("W") * (entryMessage?.length ?? 0) * 1.2;
      const strokeAlpha = Math.min(alpha * 255, 255);
      const strokeColor = p.color(color);
      strokeColor.setAlpha(strokeAlpha);
      const fillColor = p.color(color);
      fillColor.setAlpha(strokeAlpha);

      tex.push();
      tex.translate(x, y);

      tex.noFill();
      tex.stroke(strokeColor);
      tex.rectMode(p.CENTER);
      tex.rect(0, 0, rectWidth, rectHeight);

      tex.fill(fillColor);
      tex.noStroke();
      VertText.vertText(p, tex, entryMessage || "", 0, 0, "CENTER");
      tex.pop();
    }
    tex.pop();
  }
}
