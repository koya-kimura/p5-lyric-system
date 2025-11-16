import type { Movement, MovementContext } from "../../interfaces/Movement";
import { Easing } from "../../utils/easing";

export class SpreadFadeMovement implements Movement {
  readonly id = "spreadFade";
  readonly label = "文字拡散";

  draw({ p, tex, message, progress }: MovementContext): void {
    const safeMessage = message || "";
    const clamped = Math.min(1, Math.max(0, progress));
    const fade = Easing.easeInOutQuad(clamped);
    const spread = Easing.easeOutCubic(clamped);

    const maxSize = Math.min(tex.width, tex.height);
    const baseSize = maxSize * 0.075;
    const lineHeight = baseSize * 1.2;
    const extraSpacing = baseSize * 0.35 * spread;
    const baseSpacing = baseSize * 0.05;

    const lines = safeMessage.split(/\r?\n/);
    const totalHeight = lines.length * lineHeight;
    const startY = tex.height / 2 - totalHeight / 2 + lineHeight / 2;

    tex.push();
    tex.noStroke();
    tex.fill(255, 255, 255, Math.floor(255 * fade));
    tex.textAlign(p.LEFT, p.CENTER);
    tex.textSize(baseSize);
    tex.textLeading(lineHeight);
    tex.textWrap(p.WORD);

    lines.forEach((line, index) => {
      const characters = [...line];
      if (characters.length === 0) {
        return;
      }

      let totalWidth = 0;
      characters.forEach((char) => {
        totalWidth += tex.textWidth(char);
      });
      totalWidth += Math.max(0, characters.length - 1) * (baseSpacing + extraSpacing);

      let cursorX = tex.width / 2 - totalWidth / 2;
      const cursorY = startY + index * lineHeight;

      characters.forEach((char) => {
        const glyph = char === " " ? "\u00A0" : char;
        tex.text(glyph, cursorX, cursorY);
        cursorX += tex.textWidth(glyph) + baseSpacing + extraSpacing;
      });
    });

    tex.pop();
  }
}
