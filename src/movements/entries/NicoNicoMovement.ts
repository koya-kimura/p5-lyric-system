import p5 from "p5";
import type { Movement, MovementContext, MovementLyricPayload } from "../../interfaces/Movement";

export class NicoNicoMovement implements Movement {
  readonly id = "NicoNico";
  readonly label = "ニコニコ";
  private niconicoArray: NicoNicoText[] = [];

  onLyricChange(payload: MovementLyricPayload): void {
    this.niconicoArray.push(new NicoNicoText(payload.message, payload.color));
  }

  draw({ p, tex, message, beatsElapsed }: MovementContext): void {
    for(let i = this.niconicoArray.length -1; i >= 0; i--){
      const nico = this.niconicoArray[i];
      nico.update();
      nico.draw(p, tex);
      if(nico.isDead(tex)){
        this.niconicoArray.splice(i, 1);
      }
    }
  }
}

class NicoNicoText {
  private x: number;
  private y: number
  private vx: number;
  private message: string;
  private color: string;

  constructor(message: string, color: string) {
    this.x = 1.0;
    this.y = Math.random();
    this.message = message;
    this.vx = Math.random() * 0.002 + 0.005;
    this.color = color;
  }

  update(){
    this.x -= this.vx;
  }

  draw(p: p5, tex: p5.Graphics){
    const x = this.x * tex.width;
    const y = this.y * tex.height;
    const s = Math.min(tex.width, tex.height) * 0.1;

    tex.push();
    tex.textAlign(p.LEFT, p.CENTER);
    tex.textSize(s);
    tex.fill(this.color);
    tex.noStroke();
    tex.text(this.message, x, y);
    tex.pop();
  }

  isDead(tex: p5.Graphics): boolean {
    return this.x < -tex.width;
  }
}