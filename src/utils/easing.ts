// Easing はアニメーション向けの汎用イージング関数群を集約する。

/**
 * 汎用的なイージング関数を提供するユーティリティクラス。
 * すべての関数は 0から1 の入力 (x) を受け取り、0から1 の出力 (アニメーションの進行度) を返します。
 */
export class Easing {
    // 静的メソッドとして元のロジックをそのまま保持

    // easeInSine はサインカーブを用いて滑らかに加速する。
    static easeInSine(x: number): number {
        return 1 - Math.cos((x * Math.PI) / 2);
    }

    // easeOutSine はサインカーブを用いて滑らかに減速する。
    static easeOutSine(x: number): number {
        return Math.sin((x * Math.PI) / 2);
    }

    // easeInOutSine はサインベースの緩急を前半後半に分配する。
    static easeInOutSine(x: number): number {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    }

    // easeInQuad は二次関数での加速を行う。
    static easeInQuad(x: number): number {
        return x * x;
    }

    // easeOutQuad は二次関数で減速させる。
    static easeOutQuad(x: number): number {
        return 1 - (1 - x) * (1 - x);
    }

    // easeInOutQuad は二次カーブの前半加速・後半減速を提供する。
    static easeInOutQuad(x: number): number {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    // easeInCubic は三次関数で勢いを付けていく。
    static easeInCubic(x: number): number {
        return x * x * x;
    }

    // easeOutCubic は三次関数で滑らかに停止する。
    static easeOutCubic(x: number): number {
        return 1 - Math.pow(1 - x, 3);
    }

    // easeInOutCubic は三次カーブを前後半に適用する。
    static easeInOutCubic(x: number): number {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    // easeInQuart は四次関数で急激に加速する。
    static easeInQuart(x: number): number {
        return x * x * x * x;
    }

    // easeOutQuart は四次関数で余韻を残して停止する。
    static easeOutQuart(x: number): number {
        return 1 - Math.pow(1 - x, 4);
    }

    // easeInOutQuart は四次カーブの強い緩急を提供する。
    static easeInOutQuart(x: number): number {
        return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
    }

    // easeInQuint は五次関数でさらに鋭い加速を作る。
    static easeInQuint(x: number): number {
        return x * x * x * x * x;
    }

    // easeOutQuint は五次関数で鋭く減速する。
    static easeOutQuint(x: number): number {
        return 1 - Math.pow(1 - x, 5);
    }

    // easeInOutQuint は五次カーブの極端な緩急を前後半に適用する。
    static easeInOutQuint(x: number): number {
        return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
    }

    // easeInExpo は指数関数で瞬発力のある加速を生む。
    static easeInExpo(x: number): number {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }

    // easeOutExpo は指数関数で素早い減速を行う。
    static easeOutExpo(x: number): number {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    // easeInOutExpo は指数カーブの両端に急激な変化を入れる。
    static easeInOutExpo(x: number): number {
        return x === 0 ?
            0 :
            x === 1 ?
                1 :
                x < 0.5 ?
                    Math.pow(2, 20 * x - 10) / 2 :
                    (2 - Math.pow(2, -20 * x + 10)) / 2;
    }

    // easeInCirc は円弧を模して滑らかに始まる。
    static easeInCirc(x: number): number {
        return 1 - Math.sqrt(1 - Math.pow(x, 2));
    }

    // easeOutCirc は円弧を模して滑らかに終わる。
    static easeOutCirc(x: number): number {
        return Math.sqrt(1 - Math.pow(x - 1, 2));
    }

    // easeInOutCirc は円弧の前半・後半を接続した軌道を描く。
    static easeInOutCirc(x: number): number {
        return x < 0.5 ?
            (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 :
            (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
    }

    // easeOutBack はオーバーシュートを伴う勢いのある減速を生む。
    static easeOutBack(x: number): number {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }

    // easeInOutBack はオーバーシュートを前後半に分配する。
    static easeInOutBack(x: number): number {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return x < 0.5 ?
            (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 :
            (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
    }

    // --- バウンド系イージングを追加 ---
    
    // bounceRatioとbounceCountのデフォルト値を持つ、汎用的なバウンド関数（未使用のため削除・設定値として残す）
    // static defaultBounceRatio: number = 7.5625;
    // static defaultBounceCount: number = 4; // easeOutBounceの区間数に基づく

    // easeOutBounce は目標に到達する前に複数回跳ね返る（標準）。
    // (x: 0->1 の入力, 1.0 - easeInBounce(1-x) のロジック)
    static easeOutBounce(x: number): number {
        const n = 1 - x;
        const d1 = 1 / 2.75;
        const d2 = 2 / 2.75;
        const d3 = 2.5 / 2.75;

        if (n < d1) {
            return 1 - (7.5625 * n * n);
        } else if (n < d2) {
            return 1 - (7.5625 * (n - 1.5 / 2.75) * (n - 1.5 / 2.75) + 0.75);
        } else if (n < d3) {
            return 1 - (7.5625 * (n - 2.25 / 2.75) * (n - 2.25 / 2.75) + 0.9375);
        } else {
            return 1 - (7.5625 * (n - 2.625 / 2.75) * (n - 2.625 / 2.75) + 0.984375);
        }
    }

    // easeOutSlightBounce はバウンドがゆるめ（控えめな跳ね返り）。
    // 標準の easeOutBounce の係数を調整して、跳ね返りを小さく、回数を少なくする
    static easeOutSlightBounce(x: number): number {
        const n = 1 - x;
        const d1 = 1 / 2.75;
        const d2 = 2 / 2.75;
        
        if (n < d1) {
            return 1 - (4.0 * n * n); // 係数を小さくして初期の勢いを抑える
        } else if (n < d2) {
            return 1 - (4.0 * (n - 1.5 / 2.75) * (n - 1.5 / 2.75) + 0.9); // バウンドの深さを抑える (0.9 vs 0.75)
        } else {
            // 最後の区間はバウンドさせずに終端へ向かう
            return 1 - (1.0 * (n - 2.5 / 2.75) + 0.99); // 終端に近づける
        }
    }

    // easeOutHarshBounce はバウンドがはげしめ（大きな跳ね返り、より多くのバウンド）。
    // 標準の easeOutBounce の係数を調整して、跳ね返りを大きく、回数を増やす
    static easeOutHarshBounce(x: number): number {
        const n = 1 - x;
        const d1 = 1 / 4.0;
        const d2 = 2 / 4.0;
        const d3 = 3 / 4.0;
        const d4 = 3.5 / 4.0;
        
        const coeff = 10.0; // 係数を大きくして初期の勢いを増す

        if (n < d1) {
            return 1 - (coeff * n * n);
        } else if (n < d2) {
            return 1 - (coeff * (n - 1.5 / 4.0) * (n - 1.5 / 4.0) + 0.5); // 0.5 vs 0.75
        } else if (n < d3) {
            return 1 - (coeff * (n - 2.5 / 4.0) * (n - 2.5 / 4.0) + 0.85); // 0.85 vs 0.9375
        } else if (n < d4) {
             return 1 - (coeff * (n - 3.25 / 4.0) * (n - 3.25 / 4.0) + 0.95);
        }
         else {
            return 1 - (coeff * (n - 3.75 / 4.0) * (n - 3.75 / 4.0) + 0.99); // 0.99 vs 0.984375
        }
    }
}