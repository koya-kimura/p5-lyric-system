import type { Movement } from "../interfaces/Movement";
import { CenterScaleMovement } from "./entries/CenterScaleMovement";
import { VerticalMovement } from "./entries/VerticalMovement";
import { VerticalTextDisplay } from "./entries/VerticalTextDisplay";
import { TwoBoxMovement } from "./entries/TwoTextBoxMovement";

const movementRegistry: Movement[] = [
  new TwoBoxMovement(),
  new VerticalTextDisplay(),
  new VerticalMovement(),
  new CenterScaleMovement(),
];

const movementAliases: Record<string, Movement> = {
  rightFade: movementRegistry[1],
};

export const movements: readonly Movement[] = movementRegistry;

export const getMovementById = (id: string): Movement =>
  movementRegistry.find((movement) => movement.id === id)
    ?? movementAliases[id]
    ?? movementRegistry[0];
