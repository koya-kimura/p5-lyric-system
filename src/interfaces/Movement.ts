import type p5 from "p5";

export type MovementId = string;

export type MovementContext = {
  p: p5;
  tex: p5.Graphics;
  message: string;
  elapsedMs: number;
  durationMs: number;
  progress: number;
};

export interface Movement {
  readonly id: MovementId;
  readonly label: string;
  draw(context: MovementContext): void;
}
