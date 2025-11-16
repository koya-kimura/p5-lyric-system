// main.ts は p5 スケッチのエントリーポイントとして描画ループを構成する。
import p5 from "p5";
import "./style.css";

import { TexManager } from "./core/texManager";
import { EffectManager } from "./core/effectManager";
import { bootstrapClient } from "./app/bootstrapClient";
import { preloadFontsWithP5 } from "./core/fontRegistry";

const start = async () => {
  const { role, layout, store, telemetry } = await bootstrapClient();

  const texManager = new TexManager(store);
  const effectManager = new EffectManager();

  // sketch は p5 インスタンスモードで実行されるエントリー関数。
  const sketch = (p: p5) => {
    let fpsSampleStart = 0;
    let framesSinceSample = 0;

    // setup は一度だけ呼ばれ、レンダーターゲットとシェーダーを初期化する。
    p.setup = async () => {
      const { width, height } = layout.getCanvasSize();
      p.createCanvas(width, height, p.WEBGL);

      await preloadFontsWithP5(p);

      texManager.init(p);

      await effectManager.load(
        p,
        "/shader/post.vert",
        "/shader/post.frag",
      );
    };

    // draw は毎フレームのループでシーン更新とポストエフェクトを適用する。
    p.draw = () => {
      p.background(0);

      texManager.update(p);
      texManager.draw(p);

      effectManager.apply(p, texManager.getTexture());

      if (role === "perform") {
        const now = p.millis();
        if (fpsSampleStart === 0) {
          fpsSampleStart = now;
          framesSinceSample = 0;
        }

        framesSinceSample += 1;
        const elapsed = now - fpsSampleStart;
        if (elapsed >= 1000) {
          const fps = (framesSinceSample * 1000) / Math.max(elapsed, 1);
          telemetry.reportFrameRate("perform", fps);
          framesSinceSample = 0;
          fpsSampleStart = now;
        }
      }
    };

    // windowResized はブラウザのリサイズに追従してバッファを更新する。
    p.windowResized = () => {
      const { width, height } = layout.getCanvasSize();
      p.resizeCanvas(width, height);
      texManager.resize(p);
    };

    // keyPressed はスペースキーでフルスクリーンを切り替えるショートカットを提供。
    p.keyPressed = () => {
      if (p.keyCode === 32 && role === "perform") {
        p.fullscreen(true);
      }
    };
  };

  // p5.js スケッチを起動する。
  new p5(sketch, layout.canvasParent);
};

void start();