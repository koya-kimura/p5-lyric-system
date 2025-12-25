import type { Movement, MovementContext } from "../../interfaces/Movement";

export class CenterTopMovement implements Movement {
    readonly id = "centerTop";
    readonly label = "中央上部";

    draw({ p, tex, message, color }: MovementContext): void {
        const safeMessage = message || "";
        const maxSize = tex.width / Math.max(safeMessage.length * 2, 14);

        tex.push();
        tex.noStroke();
        tex.fill(color);
        tex.textAlign(p.CENTER, p.CENTER);
        tex.textSize(maxSize);

        // Position at top-center (about 15% from top)
        const yPosition = tex.height * 0.15;
        tex.text(safeMessage, tex.width / 2, yPosition);
        tex.pop();
    }
}
