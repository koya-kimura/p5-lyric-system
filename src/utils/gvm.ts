// GVM はグラフ生成やノイズ関数のユーティリティを提供する。
import { UniformRandom } from "./uniformRandom";

export class GVM {
    // leapNoise はシームレスにループする補間ノイズを生成する。
    static leapNoise(x: number, loop: number, move: number, seed1: number = 0, seed2: number = 0): number {
        const count = Math.floor(x / loop);
        const t = GVM.clamp((x % loop - (loop - move)) / move, 0, 1);

        const x1 = UniformRandom.uniformRandom(seed1, seed2, count);
        const x2 = UniformRandom.uniformRandom(seed1, seed2, count + 1);

        return GVM.map(t, 0, 1, x1, x2);
    }

    // map は入力値を指定範囲から別の範囲へ線形変換する。
    static map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    // clamp は値を指定した最小値と最大値の間に収める。
    static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }
}