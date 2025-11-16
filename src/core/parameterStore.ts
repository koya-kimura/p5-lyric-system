import { movements, getMovementById } from "../movements";
import type { MovementId } from "../interfaces/Movement";
export type { MovementId } from "../interfaces/Movement";

const DEFAULT_MESSAGE = "";
const DEFAULT_MOVEMENT_ID: MovementId = movements[0]?.id ?? "fade";
const DEFAULT_TEMPO_BPM = 120;

type ParameterStateBase = {
  message: string;
  manualMessage: string;
  selectedSongId: string | null;
  activeLyricIndex: number;
  tempoBpm: number;
};

export type ParameterState = ParameterStateBase & {
  movementId: MovementId;
};

type SerializableState = ParameterStateBase & {
  movementId?: MovementId;
};

type Listener = (state: ParameterState) => void;

type SetStateOptions = {
  broadcast: boolean;
};

const STORAGE_KEY = "lyrics-system::parameters";

export class ParameterStore {
  private state: ParameterState;
  private readonly listeners = new Set<Listener>();
  private readonly channel: BroadcastChannel | null;

  constructor(initial?: Partial<ParameterState>) {
    this.state = {
      message: initial?.message ?? DEFAULT_MESSAGE,
      manualMessage: initial?.manualMessage ?? (initial?.message ?? DEFAULT_MESSAGE),
      selectedSongId: initial?.selectedSongId ?? null,
      activeLyricIndex: initial?.activeLyricIndex ?? -1,
      tempoBpm: initial?.tempoBpm ?? DEFAULT_TEMPO_BPM,
      movementId: initial?.movementId ?? DEFAULT_MOVEMENT_ID,
    };

    this.channel = typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel("lyrics-system::parameters")
      : null;

    if (this.channel) {
      this.channel.addEventListener("message", (event) => {
        const payload = event.data;
        if (!payload || typeof payload !== "object") {
          return;
        }
        if (payload.type === "state" && payload.state) {
          this.applyState(payload.state, { broadcast: false });
        }
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY || !event.newValue) {
          return;
        }

        try {
          const parsed = JSON.parse(event.newValue) as { state?: SerializableState };
          if (parsed.state) {
            this.applyState(parsed.state, { broadcast: false });
          }
        } catch (error) {
          console.warn("Failed to parse parameter payload", error);
        }
      });
    }
  }

  getState(): ParameterState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  update(partial: Partial<ParameterState>): void {
    this.applyState({
      ...this.state,
      ...partial,
    }, { broadcast: true });
  }

  setManualMessage(message: string): void {
    this.applyState({
      ...this.state,
      message,
      manualMessage: message,
      activeLyricIndex: -1,
    }, { broadcast: true });
  }

  selectSong(songId: string | null): void {
    this.applyState({
      ...this.state,
      selectedSongId: songId,
      activeLyricIndex: -1,
    }, { broadcast: true });
  }

  showLyric(payload: { songId: string; index: number; text: string }): void {
    this.applyState({
      ...this.state,
      selectedSongId: payload.songId,
      activeLyricIndex: payload.index,
      message: payload.text,
    }, { broadcast: true });
  }

  setTempoBpm(bpm: number): void {
    this.applyState({
      ...this.state,
      tempoBpm: Number.isFinite(bpm) ? Math.max(1, bpm) : this.state.tempoBpm,
    }, { broadcast: true });
  }

  setMovement(movementId: MovementId): void {
    this.applyState({
      ...this.state,
      movementId,
    }, { broadcast: true });
  }

  private applyState(nextState: ParameterState | SerializableState, options: SetStateOptions): void {
    this.state = this.normalizeState(nextState);
    this.emit();

    if (!options.broadcast) {
      return;
    }

    try {
      this.channel?.postMessage({ type: "state", state: this.state });
    } catch (error) {
      console.warn("Broadcast channel post failed", error);
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: this.state }));
      } catch (error) {
        console.warn("localStorage sync failed", error);
      }
    }
  }

  private normalizeState(state: ParameterState | SerializableState): ParameterState {
    const candidateMovementId = state.movementId ?? DEFAULT_MOVEMENT_ID;
    const resolvedMovement = getMovementById(candidateMovementId);

    return {
      message: state.message ?? DEFAULT_MESSAGE,
      manualMessage: state.manualMessage ?? DEFAULT_MESSAGE,
      selectedSongId: state.selectedSongId,
      activeLyricIndex: state.activeLyricIndex,
      tempoBpm: this.sanitizeTempo(state.tempoBpm),
      movementId: resolvedMovement.id,
    };
  }

  private sanitizeTempo(candidate: number | undefined): number {
    const tempo = Number.isFinite(candidate) ? Number(candidate) : DEFAULT_TEMPO_BPM;
    return Math.max(1, tempo);
  }

  private emit(): void {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }
}
