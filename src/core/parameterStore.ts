import { movements, getMovementById } from "../movements";
import type { MovementId } from "../interfaces/Movement";
import { getFontById, getDefaultFontId, type FontDefinition, type FontId } from "./fontRegistry";
export type { MovementId } from "../interfaces/Movement";
export type { FontId } from "./fontRegistry";

export type DisplayMode = "lyrics" | "logo" | "blank";

const DEFAULT_MESSAGE = "";
const DEFAULT_MOVEMENT_ID: MovementId = movements[0]?.id ?? "fade";
const DEFAULT_TEMPO_BPM = 120;
const DEFAULT_FONT_ID: FontId = getDefaultFontId();
const DEFAULT_DISPLAY_MODE: DisplayMode = "lyrics";
const DEFAULT_COLOR = "#38BDF8";

type ParameterStateBase = {
  message: string;
  messageVersion: number;
  manualMessage: string;
  manualOverrideVersion: number | null;
  selectedSongId: string | null;
  activeLyricIndex: number;
  tempoBpm: number;
  fontId: FontId;
  displayMode: DisplayMode;
  color: string;
};

export type ParameterState = ParameterStateBase & {
  movementId: MovementId;
};

type SerializableState = Partial<ParameterState>;

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
      messageVersion: initial?.messageVersion ?? 0,
      manualMessage: initial?.manualMessage ?? (initial?.message ?? DEFAULT_MESSAGE),
      manualOverrideVersion: initial?.manualOverrideVersion ?? null,
      selectedSongId: initial?.selectedSongId ?? null,
      activeLyricIndex: initial?.activeLyricIndex ?? -1,
      tempoBpm: initial?.tempoBpm ?? DEFAULT_TEMPO_BPM,
      movementId: initial?.movementId ?? DEFAULT_MOVEMENT_ID,
      fontId: initial?.fontId ?? DEFAULT_FONT_ID,
      displayMode: initial?.displayMode ?? DEFAULT_DISPLAY_MODE,
      color: this.sanitizeColor(initial?.color),
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
    const nextState: ParameterState = {
      ...this.state,
      ...partial,
    };

    if (partial.message !== undefined && partial.messageVersion === undefined) {
      nextState.messageVersion = this.state.messageVersion + 1;
    }

    this.applyState(nextState, { broadcast: true });
  }

  setManualMessage(message: string): void {
    const nextVersion = this.state.messageVersion + 1;
    this.applyState({
      ...this.state,
      message,
      messageVersion: nextVersion,
      manualMessage: message,
      manualOverrideVersion: nextVersion,
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
    const nextVersion = this.state.messageVersion + 1;
    this.applyState({
      ...this.state,
      selectedSongId: payload.songId,
      activeLyricIndex: payload.index,
      message: payload.text,
      messageVersion: nextVersion,
      manualOverrideVersion: null,
    }, { broadcast: true });
  }

  setTempoBpm(bpm: number): void {
    this.applyState({
      ...this.state,
      tempoBpm: Number.isFinite(bpm) ? Math.max(1, bpm) : this.state.tempoBpm,
    }, { broadcast: true });
  }

  setFont(fontId: FontId): void {
    const resolved = this.resolveFont(fontId);
    this.applyState({
      ...this.state,
      fontId: resolved.id,
    }, { broadcast: true });
  }

  setDisplayMode(mode: DisplayMode): void {
    const resolved = this.normalizeDisplayMode(mode);
    this.applyState({
      ...this.state,
      displayMode: resolved,
    }, { broadcast: true });
  }

  setColor(color: string): void {
    this.applyState({
      ...this.state,
      color: this.sanitizeColor(color),
    }, { broadcast: true });
  }

  setMovement(movementId: MovementId): void {
    this.applyState({
      ...this.state,
      movementId,
    }, { broadcast: true });
  }

  private applyState(nextState: ParameterState | SerializableState, options: SetStateOptions): void {
    const normalized = this.normalizeState(nextState);
    if (normalized.messageVersion < this.state.messageVersion) {
      return;
    }

    const manualOverrideActive = this.state.manualOverrideVersion !== null
      && this.state.manualOverrideVersion === this.state.messageVersion;
    if (
      manualOverrideActive
      && normalized.manualOverrideVersion === null
      && normalized.messageVersion === this.state.messageVersion
    ) {
      return;
    }

    this.state = normalized;
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
      messageVersion: this.sanitizeVersion(state.messageVersion),
      manualMessage: state.manualMessage ?? state.message ?? DEFAULT_MESSAGE,
      manualOverrideVersion: this.sanitizeManualOverride(state.manualOverrideVersion),
      selectedSongId: state.selectedSongId ?? null,
      activeLyricIndex: state.activeLyricIndex ?? -1,
      tempoBpm: this.sanitizeTempo(state.tempoBpm),
      movementId: resolvedMovement.id,
      fontId: this.resolveFont(state.fontId).id,
      displayMode: this.normalizeDisplayMode(state.displayMode),
      color: this.sanitizeColor(state.color),
    };
  }

  private sanitizeTempo(candidate: number | undefined): number {
    const tempo = Number.isFinite(candidate) ? Number(candidate) : DEFAULT_TEMPO_BPM;
    return Math.max(1, tempo);
  }

  private sanitizeVersion(candidate: number | undefined): number {
    if (!Number.isFinite(candidate)) {
      return 0;
    }
    const value = Math.floor(Number(candidate));
    return value < 0 ? 0 : value;
  }

  private sanitizeManualOverride(candidate: number | null | undefined): number | null {
    if (!Number.isFinite(candidate)) {
      return null;
    }
    const value = Math.floor(Number(candidate));
    return value < 0 ? null : value;
  }

  private resolveFont(fontId: FontId | undefined): FontDefinition {
    return getFontById(fontId ?? DEFAULT_FONT_ID);
  }

  private sanitizeColor(candidate: string | undefined | null): string {
    if (typeof candidate === "string") {
      const value = candidate.trim();
      if (/^#([0-9a-f]{3}){1,2}$/i.test(value)) {
        if (value.length === 4) {
          const r = value.charAt(1);
          const g = value.charAt(2);
          const b = value.charAt(3);
          return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
        }
        return value.toUpperCase();
      }
    }
    return DEFAULT_COLOR;
  }

  private normalizeDisplayMode(candidate: DisplayMode | string | undefined): DisplayMode {
    if (candidate === "logo" || candidate === "blank") {
      return candidate;
    }
    return DEFAULT_DISPLAY_MODE;
  }

  private emit(): void {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }
}
