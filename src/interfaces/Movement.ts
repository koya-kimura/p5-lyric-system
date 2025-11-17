import type p5 from "p5";

export type MovementId = string;

export type MovementContext = {
  p: p5;
  tex: p5.Graphics;
  message: string;
  lyricIndex: number;
  elapsedMs: number;
  bpm: number;
  beatsElapsed: number;
};

export interface Movement {
  readonly id: MovementId;
  readonly label: string;
  draw(context: MovementContext): void;
  onLyricChange?(payload: { message: string; lyricIndex: number }): void;
}
