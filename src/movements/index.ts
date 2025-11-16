import type { Movement } from "../interfaces/Movement";
import { DownSlideMovement } from "./entries/DownSlideMovement";

const movementRegistry: Movement[] = [
  new DownSlideMovement(),
];

const movementAliases: Record<string, Movement> = {
  rightFade: movementRegistry[1],
};

export const movements: readonly Movement[] = movementRegistry;

export const getMovementById = (id: string): Movement =>
  movementRegistry.find((movement) => movement.id === id)
    ?? movementAliases[id]
    ?? movementRegistry[0];
