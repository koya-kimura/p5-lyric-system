import type p5 from "p5";
export type MovementContext = {
  p: p5;
  tex: p5.Graphics;
  message: string;
  elapsedMs: number;
  bpm: number;
  beatsElapsed: number;
};

export type Movement = {
  id: string;
  label: string;
  description?: string;
  draw: (context: MovementContext) => void;
};

export const movements: Movement[] = [
  {
    id: "fade",
    label: "中央フェードイン",
    description: "中央に淡く広がりながら文字が浮かぶ",
    draw: ({ p, tex, message, beatsElapsed }) => {
      const maxSize = Math.min(tex.width, tex.height);
      const clamped = Math.min(1, Math.max(0, beatsElapsed));
      const textAlpha = Math.floor(255 * clamped);

      tex.noStroke();
      tex.fill(255, 255, 255, textAlpha);
      tex.textAlign(p.CENTER, p.CENTER);
      tex.textSize(maxSize * 0.08);
      tex.textLeading(maxSize * 0.09);
      tex.textWrap(p.WORD);
      tex.text(message || "", tex.width / 2, tex.height / 2, tex.width * 0.7, tex.height * 0.7);
    },
  },
  {
    id: "rightFade",
    label: "右からフェードイン",
    description: "右端から滑らかにスライドしながら表示",
    draw: ({ p, tex, message, beatsElapsed }) => {
      const maxSize = Math.min(tex.width, tex.height);
      const clamped = Math.min(1, Math.max(0, beatsElapsed));
      const eased = clamped <= 0 ? 0 : Math.pow(clamped, 0.85);

      const startX = tex.width + maxSize * 0.35;
      const targetX = tex.width / 2;
      const currentX = startX + (targetX - startX) * eased;

      const textAlpha = Math.floor(255 * clamped);

      const textOffset = tex.width * 0.12 * (1 - eased);

      tex.noStroke();
      tex.fill(255, 255, 255, textAlpha);
      tex.textAlign(p.CENTER, p.CENTER);
      tex.textSize(maxSize * 0.08);
      tex.textLeading(maxSize * 0.09);
      tex.textWrap(p.WORD);
      tex.text(message || "", currentX - textOffset, tex.height / 2, tex.width * 0.7, tex.height * 0.7);
    },
  },
];

export const getMovementById = (id: string) => movements.find((movement) => movement.id === id) ?? movements[0];