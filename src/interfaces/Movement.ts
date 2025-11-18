import type p5 from "p5";
import type { FontId } from "../core/fontRegistry";

export type MovementId = string;

export type MovementContext = {
  p: p5;
  tex: p5.Graphics;
  message: string;
  lyricIndex: number;
  elapsedMs: number;
  bpm: number;
  beatsElapsed: number;
  fontId: FontId;
  color: string;
};

export type MovementLyricPayload = {
  message: string;
  lyricIndex: number;
  fontId: FontId;
  color: string;
};

export interface Movement {
  readonly id: MovementId;
  readonly label: string;
  draw(context: MovementContext): void;
  onLyricChange?(payload: MovementLyricPayload): void;
}