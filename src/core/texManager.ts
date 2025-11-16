import p5 from "p5";

import type { Scene } from "../interfaces/Scene";
import { SampleScene } from "../scenes/mainScene";
import type { ParameterStore } from "./parameterStore";
import { getMovementById } from "../movements";
import type { Movement } from "../interfaces/Movement";

// TexManager は描画用の p5.Graphics とシーン、MIDI デバッグ描画のハブを担当する。
export class TexManager {
    private renderTexture: p5.Graphics | null;
    private readonly scenes: Scene[];
    private activeSceneIndex = 0;
    private activeMovement: Movement;

    // コンストラクタではデバッグ用シーン管理と MIDI ハンドラをセットアップする。
    constructor(parameterStore: ParameterStore) {
        this.renderTexture = null;
        this.scenes = [new SampleScene(parameterStore)];
        this.activeMovement = getMovementById(parameterStore.getState().movementId);

        parameterStore.subscribe((state) => {
            this.activeMovement = getMovementById(state.movementId);
        });
    }

    // init はキャンバスサイズに合わせた描画用 Graphics を初期化する。
    init(p: p5): void {
        this.renderTexture = p.createGraphics(p.width, p.height);
    }

    // getTexture は初期化済みの描画バッファを返し、未初期化時はエラーとする。
    getTexture(): p5.Graphics {
        const texture = this.renderTexture;
        if (!texture) {
            throw new Error("Texture not initialized");
        }
        return texture;
    }

    // resize は現在の Graphics を最新のウィンドウサイズに追従させる。
    resize(p: p5): void {
        const texture = this.renderTexture;
        if (!texture) {
            throw new Error("Texture not initialized");
        }
        texture.resizeCanvas(p.width, p.height);
    }

    // update はシーンの更新前に MIDI 状態を反映させる。
    update(p: p5): void {
        const currentScene = this.scenes[this.activeSceneIndex];
        currentScene.update(p);
    }

    // draw はシーン描画と MIDI デバッグオーバーレイを Graphics 上にまとめて描画する。
    draw(p: p5): void {
        const texture = this.renderTexture;
        if (!texture) {
            throw new Error("Texture not initialized");
        }

        texture.push();
        texture.clear(0, 0, 0, 0);
        const currentScene = this.scenes[this.activeSceneIndex];
        currentScene.draw(p, texture, this.activeMovement);
        texture.pop();
    }
}