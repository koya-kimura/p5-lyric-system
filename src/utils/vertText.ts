import p5 from "p5";

export class VertText {
    static vertText(tex: p5.Graphics, text: string, x: number, y: number): void {
        const characters = text.split("");
        const space = tex.textWidth("W") * 1.1;

        tex.push();
        for(let i = 0; i < characters.length; i++) {
            const tx = x;
            const ty = y + i * space + (space * 0.5);
            const char = characters[i];
            tex.push();
            tex.translate(tx, ty);
            if(char === "ー"){
                tex.rotate(Math.PI / 2);
                tex.translate(-space * 0.5, space * 0.5)
            } else {
                tex.translate(-space * 0.5, -space * 0.5)
            }
            tex.text(char, 0, 0);
            tex.pop();
        }
        tex.pop();
    }
}