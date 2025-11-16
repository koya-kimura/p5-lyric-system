import type p5 from "p5";
import type { Movement } from "./Movement";

export interface Scene {
  update(p: p5): void;
  draw(p: p5, tex: p5.Graphics, movement: Movement): void;
}
