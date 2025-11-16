import type { Movement } from "../interfaces/Movement";
import { FadeMovement } from "./entries/FadeMovement";
import { RightSlideMovement } from "./entries/RightSlideMovement";
import { LeftSlideMovement } from "./entries/LeftSlideMovement";
import { UpSlideMovement } from "./entries/UpSlideMovement";
import { DownSlideMovement } from "./entries/DownSlideMovement";
import { ScalePopMovement } from "./entries/ScalePopMovement";
import { SpreadFadeMovement } from "./entries/SpreadFadeMovement";
import { PulseGlowMovement } from "./entries/PulseGlowMovement";

const movementRegistry: Movement[] = [
  new FadeMovement(),
  new RightSlideMovement(),
  new LeftSlideMovement(),
  new UpSlideMovement(),
  new DownSlideMovement(),
  new ScalePopMovement(),
  new SpreadFadeMovement(),
  new PulseGlowMovement(),
];

const movementAliases: Record<string, Movement> = {
  rightFade: movementRegistry[1],
};

export const movements: readonly Movement[] = movementRegistry;

export const getMovementById = (id: string): Movement =>
  movementRegistry.find((movement) => movement.id === id)
    ?? movementAliases[id]
    ?? movementRegistry[0];
