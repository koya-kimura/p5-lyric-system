import type { ParameterStore, ParameterState, MovementId } from "../core/parameterStore";
import type { LyricsLibrary } from "./lyricsService";
import { TelemetryChannel, type TelemetryEvent } from "../core/telemetry";
import { movements } from "../movements";

export type ControlPanelContext = {
  canvasParent: HTMLElement;
  getCanvasSize: () => { width: number; height: number };
};

type ControlPanelOptions = {
  root: HTMLElement;
  store: ParameterStore;
  performanceUrl: string;
  lyrics: LyricsLibrary;
  telemetry: TelemetryChannel;
};

type PanelMetrics = {
  translateX: number;
  translateY: number;
};

export class ControlPanel {
  private readonly store: ParameterStore;
  private readonly lyrics: LyricsLibrary;
  private readonly performanceUrl: string;
  private readonly telemetry: TelemetryChannel;
  private readonly layout: HTMLElement;
  private readonly previewPanel: HTMLElement;
  private readonly canvasHost: HTMLElement;
  private readonly songSelect: HTMLSelectElement;
  private readonly lyricsList: HTMLElement;
  private readonly manualInput: HTMLTextAreaElement;
  private readonly manualButton: HTMLButtonElement;
  private readonly fadeSlider: HTMLInputElement;
  private readonly fadeValue: HTMLSpanElement;
  private readonly fadeBpm: HTMLSpanElement;
  private readonly movementRadios: Map<string, HTMLInputElement>;
  private readonly unsubscribe: () => void;
  private readonly panelStates: WeakMap<HTMLElement, PanelMetrics>;
  private readonly infoFpsValue: HTMLSpanElement;
  private readonly infoClockValue: HTMLSpanElement;
  private state: ParameterState;
  private renderedSongId: string | null;
  private telemetryUnsubscribe: (() => void) | null;
  private clockTimerId: number | null;
  private fpsResetTimerId: number | null;
  private zIndexCounter: number;
  private activeInteractions: number;
  private originalCursor: string;
  private originalUserSelect: string;

  constructor(options: ControlPanelOptions) {
    this.store = options.store;
    this.lyrics = options.lyrics;
    this.performanceUrl = options.performanceUrl;
    this.telemetry = options.telemetry;
    this.state = this.store.getState();
    this.renderedSongId = null;
    this.panelStates = new WeakMap();
    this.movementRadios = new Map();
    this.telemetryUnsubscribe = null;
    this.clockTimerId = null;
    this.fpsResetTimerId = null;
    this.zIndexCounter = 10;
    this.activeInteractions = 0;
    this.originalCursor = "";
    this.originalUserSelect = "";

    this.layout = document.createElement("div");
    this.layout.className = "control-layout";
    const previewSection = document.createElement("section");
    previewSection.className = "control-preview-frame";

    const preview = document.createElement("div");
    preview.className = "control-preview";

    this.canvasHost = document.createElement("div");
    this.canvasHost.id = "control-preview-canvas";
    this.canvasHost.style.width = "100%";
    this.canvasHost.style.height = "100%";
    this.canvasHost.tabIndex = -1;

    preview.appendChild(this.canvasHost);

    const actions = document.createElement("div");
    actions.className = "control-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = "パフォーム画面を開く";
    openButton.addEventListener("click", () => {
      const url = this.performanceUrl;
      if (!url) {
        return;
      }
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.alert("ポップアップがブロックされました。ブラウザの設定で許可してください。");
      }
    });

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "パフォームURLをコピー";
    copyButton.classList.add("secondary");
    copyButton.style.minWidth = "160px";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.performanceUrl);
        copyButton.textContent = "コピー済み";
        setTimeout(() => {
          copyButton.textContent = "パフォームURLをコピー";
        }, 1600);
      } catch {
        console.warn("Failed to copy performance URL");
      }
    });

    actions.append(openButton, copyButton);

    previewSection.append(preview, actions);

    this.previewPanel = this.createPanel("preview", previewSection);

    const lyricsSection = document.createElement("section");
    lyricsSection.className = "control-lyrics";

    const lyricsHeader = document.createElement("div");
    lyricsHeader.className = "control-lyrics-header";

    const lyricsLabel = document.createElement("label");
    lyricsLabel.textContent = "曲を選択";
    lyricsLabel.htmlFor = "control-song-select";

    this.songSelect = document.createElement("select");
    this.songSelect.id = "control-song-select";
    this.songSelect.className = "control-lyrics-select";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- 曲を選択 --";
    this.songSelect.appendChild(defaultOption);

    this.populateSongOptions();

    this.songSelect.addEventListener("change", () => {
      const selected = this.songSelect.value || null;
      this.store.selectSong(selected);
      this.renderLyricsList(selected);
      if (selected) {
        this.canvasHost.focus();
      }
    });

    lyricsHeader.append(lyricsLabel, this.songSelect);

    this.lyricsList = document.createElement("div");
    this.lyricsList.className = "control-lyrics-list";
    this.lyricsList.setAttribute("role", "listbox");

    const lyricsHint = document.createElement("small");
    lyricsHint.textContent = "歌詞をクリック、または Enter で次の行を表示";

    lyricsSection.append(lyricsHeader, this.lyricsList, lyricsHint);

    const lyricsPanel = this.createPanel("lyrics", lyricsSection);

    const paramsSection = document.createElement("section");
    paramsSection.className = "control-params";

    const paramsTitle = document.createElement("h2");
    paramsTitle.textContent = "手動テキスト";

    const messageLabel = document.createElement("label");
    const messageCaption = document.createElement("span");
    messageCaption.textContent = "表示テキスト";

    this.manualInput = document.createElement("textarea");
    this.manualInput.value = "";

    messageLabel.append(messageCaption, this.manualInput);

    this.manualButton = document.createElement("button");
    this.manualButton.type = "button";
    this.manualButton.textContent = "表示を更新";

    paramsSection.append(paramsTitle, messageLabel, this.manualButton);

    const manualHint = document.createElement("small");
    manualHint.textContent = "⌘ / Ctrl + Enter でも更新できます。";
    paramsSection.append(manualHint);

    const paramsPanel = this.createPanel("manual", paramsSection);

    const infoSection = document.createElement("section");
    infoSection.className = "control-params control-info";

    const infoTitle = document.createElement("h2");
    infoTitle.textContent = "インフォメーション";

    const infoGrid = document.createElement("div");
    infoGrid.className = "control-info-grid";

    const fpsMetric = this.createInfoMetric("パフォーム FPS");
    this.infoFpsValue = fpsMetric.value;

    const clockMetric = this.createInfoMetric("現在時刻");
    this.infoClockValue = clockMetric.value;

    infoGrid.append(fpsMetric.container, clockMetric.container);
    infoSection.append(infoTitle, infoGrid);

    const infoPanel = this.createPanel("info", infoSection);

    const movementSection = document.createElement("section");
    movementSection.className = "control-params control-movements";

    const movementTitle = document.createElement("h2");
    movementTitle.textContent = "動き選択";

    const movementList = document.createElement("div");
    movementList.className = "control-movements-list";

    movements.forEach((movement) => {
      const item = document.createElement("label");
      item.className = "control-movements-item";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "control-movement";
      input.value = movement.id;
      input.title = movement.label;
      if (movement.id === this.state.movementId) {
        input.checked = true;
        item.classList.add("is-active");
      }

      input.addEventListener("change", () => {
        if (input.checked) {
          this.store.setMovement(movement.id as MovementId);
          this.syncMovementSelection(movement.id as MovementId);
        }
      });

      const label = document.createElement("span");
      label.className = "control-movements-label";
      label.textContent = movement.label;

      item.append(input, label);

      movementList.appendChild(item);
      this.movementRadios.set(movement.id, input);
    });

    this.syncMovementSelection(this.state.movementId);

    movementSection.append(movementTitle, movementList);

    const movementPanel = this.createPanel("movement", movementSection);

    const fadeSection = document.createElement("section");
    fadeSection.className = "control-params control-params--compact";

    const fadeTitle = document.createElement("h2");
    fadeTitle.textContent = "フェード設定";

    const fadeLabel = document.createElement("label");
    fadeLabel.className = "control-params-range";

    const fadeCaption = document.createElement("span");
    fadeCaption.textContent = "動作時間";

    const fadeControls = document.createElement("div");
    fadeControls.className = "control-params-range-controls";

    this.fadeSlider = document.createElement("input");
    this.fadeSlider.type = "range";
    this.fadeSlider.min = "0";
    this.fadeSlider.max = "5000";
    this.fadeSlider.step = "100";
    this.fadeSlider.value = String(this.state.fadeDurationMs);

    this.fadeValue = document.createElement("span");
    this.fadeValue.className = "control-params-range-value";

    fadeControls.append(this.fadeSlider, this.fadeValue);

    const fadeBpm = document.createElement("span");
    fadeBpm.className = "control-params-range-bpm";

    fadeLabel.append(fadeCaption, fadeControls);
    this.fadeBpm = fadeBpm;
    fadeSection.append(fadeTitle, fadeLabel, fadeBpm);

    const fadePanel = this.createPanel("fade", fadeSection);

    this.updateFadeLabel(this.state.fadeDurationMs);

    const leftColumn = document.createElement("div");
    leftColumn.className = "control-column control-column--left";
    leftColumn.append(this.previewPanel, infoPanel);

    const centerColumn = document.createElement("div");
    centerColumn.className = "control-column control-column--center";
    centerColumn.append(fadePanel, movementPanel);

    const rightColumn = document.createElement("div");
    rightColumn.className = "control-column control-column--right";
    rightColumn.append(lyricsPanel, paramsPanel);

    this.layout.append(leftColumn, centerColumn, rightColumn);
    options.root.appendChild(this.layout);

    this.manualButton.addEventListener("click", () => {
      this.applyManualMessage();
    });

    this.manualInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        this.applyManualMessage();
      }
    });

    this.fadeSlider.addEventListener("input", () => {
      const duration = Number.parseInt(this.fadeSlider.value, 10);
      if (!Number.isNaN(duration)) {
        this.updateFadeLabel(duration);
      }
    });

    this.fadeSlider.addEventListener("change", () => {
      const duration = Number.parseInt(this.fadeSlider.value, 10);
      if (!Number.isNaN(duration)) {
        this.store.setFadeDuration(duration);
      }
    });

    this.lyricsList.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(".control-lyrics-item");
      if (!target || !target.dataset.index) {
        return;
      }
      const index = Number.parseInt(target.dataset.index, 10);
      if (Number.isNaN(index)) {
        return;
      }
      const songId = this.state.selectedSongId;
      if (!songId) {
        return;
      }
      this.triggerLyric(songId, index);
    });

    this.handleKeyDown = this.handleKeyDown.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);

    this.unsubscribe = this.store.subscribe((state) => {
      this.state = state;
      this.syncFromState(state);
    });

    this.telemetryUnsubscribe = this.telemetry.subscribe((event) => {
      this.handleTelemetry(event);
    });

    this.updateClock();
    this.clockTimerId = window.setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  getContext(): ControlPanelContext {
    return {
      canvasParent: this.canvasHost,
      getCanvasSize: () => {
        const rect = this.canvasHost.getBoundingClientRect();
        return {
          width: Math.max(1, Math.floor(rect.width)),
          height: Math.max(1, Math.floor(rect.height)),
        };
      },
    };
  }

  destroy(): void {
    this.unsubscribe();
    window.removeEventListener("keydown", this.handleKeyDown);
    this.telemetryUnsubscribe?.();
    if (this.clockTimerId !== null) {
      window.clearInterval(this.clockTimerId);
      this.clockTimerId = null;
    }
    if (this.fpsResetTimerId !== null) {
      window.clearTimeout(this.fpsResetTimerId);
      this.fpsResetTimerId = null;
    }
  }

  private createPanel(kind: string, content: HTMLElement): HTMLElement {
    const panel = document.createElement("div");
    panel.className = `control-panel control-panel--${kind}`;
    panel.dataset.panelKind = kind;

    const grip = document.createElement("div");
    grip.className = "control-panel-grip";
    grip.title = "ドラッグして移動";
    grip.setAttribute("role", "presentation");
    grip.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement("span");
      dot.className = "control-panel-grip-dot";
      grip.appendChild(dot);
    }

    const body = document.createElement("div");
    body.className = "control-panel-body";
    body.appendChild(content);

    panel.append(grip, body);

    const metrics: PanelMetrics = {
      translateX: 0,
      translateY: 0,
    };
    this.panelStates.set(panel, metrics);

    panel.style.width = "100%";
    panel.style.zIndex = String(this.zIndexCounter++);

    this.enablePanelDrag(panel, grip);

    return panel;
  }

  private enablePanelDrag(panel: HTMLElement, grip: HTMLElement): void {
    grip.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const pointerId = event.pointerId;
      const metrics = this.getPanelMetrics(panel);
      const startX = event.clientX;
      const startY = event.clientY;
      const baseX = metrics.translateX;
      const baseY = metrics.translateY;
      let currentX = baseX;
      let currentY = baseY;

      this.raisePanel(panel);
      this.startGlobalInteraction("grabbing");
      panel.classList.add("is-dragging");

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        currentX = baseX + deltaX;
        currentY = baseY + deltaY;
        panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) {
          return;
        }
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        metrics.translateX = currentX;
        metrics.translateY = currentY;
        panel.classList.remove("is-dragging");
        this.endGlobalInteraction();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    });
  }

  private getPanelMetrics(panel: HTMLElement): PanelMetrics {
    let metrics = this.panelStates.get(panel);
    if (!metrics) {
      metrics = {
        translateX: 0,
        translateY: 0,
      };
      this.panelStates.set(panel, metrics);
    }
    return metrics;
  }

  private raisePanel(panel: HTMLElement): void {
    this.zIndexCounter += 1;
    panel.style.zIndex = String(this.zIndexCounter);
  }

  private startGlobalInteraction(cursor: string): void {
    if (this.activeInteractions === 0) {
      this.originalCursor = document.body.style.cursor;
      this.originalUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
    }

    this.activeInteractions += 1;
    document.body.style.cursor = cursor;
  }

  private endGlobalInteraction(): void {
    this.activeInteractions = Math.max(0, this.activeInteractions - 1);
    if (this.activeInteractions === 0) {
      document.body.style.cursor = this.originalCursor;
      document.body.style.userSelect = this.originalUserSelect;
    }
  }

  private createInfoMetric(label: string): { container: HTMLElement; value: HTMLSpanElement } {
    const container = document.createElement("div");
    container.className = "control-info-item";

    const caption = document.createElement("span");
    caption.className = "control-info-label";
    caption.textContent = label;

    const value = document.createElement("span");
    value.className = "control-info-value";
    value.textContent = "--";

    container.append(caption, value);
    return { container, value };
  }

  private handleTelemetry(event: TelemetryEvent): void {
    if (event.type !== "fps" || event.role !== "perform") {
      return;
    }
    this.updateFps(event.fps);
  }

  private updateFps(fps: number): void {
    const rounded = Number.isFinite(fps) ? Math.max(0, fps) : 0;
    this.infoFpsValue.textContent = rounded.toFixed(1);

    if (this.fpsResetTimerId !== null) {
      window.clearTimeout(this.fpsResetTimerId);
    }

    this.fpsResetTimerId = window.setTimeout(() => {
      this.infoFpsValue.textContent = "--";
      this.fpsResetTimerId = null;
    }, 4000);
  }

  private updateClock(): void {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    this.infoClockValue.textContent = formatter.format(new Date());
  }

  private populateSongOptions(): void {
    this.lyrics.songs.forEach((song) => {
      const option = document.createElement("option");
      option.value = song.id;
      option.textContent = song.title;
      this.songSelect.appendChild(option);
    });
  }

  private renderLyricsList(songId: string | null): void {
    if (this.renderedSongId === songId) {
      this.highlightActiveLyric();
      return;
    }

    this.renderedSongId = songId;
    this.lyricsList.replaceChildren();

    if (!songId) {
      const placeholder = document.createElement("div");
      placeholder.className = "control-lyrics-empty";
      placeholder.textContent = "曲を選択すると歌詞が表示されます";
      this.lyricsList.appendChild(placeholder);
      return;
    }

    const song = this.lyrics.songMap.get(songId);
    if (!song || song.lines.length === 0) {
      const empty = document.createElement("div");
      empty.className = "control-lyrics-empty";
      empty.textContent = "歌詞が登録されていません";
      this.lyricsList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    song.lines.forEach((line) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "control-lyrics-item";
      button.dataset.index = String(line.order);
      button.textContent = `${line.lineNumber}. ${line.text}`;
      fragment.appendChild(button);
    });

    this.lyricsList.appendChild(fragment);
    this.highlightActiveLyric();
  }

  private highlightActiveLyric(): void {
    const buttons = this.lyricsList.querySelectorAll<HTMLButtonElement>(".control-lyrics-item");
    buttons.forEach((button) => {
      button.classList.remove("is-active");
    });

    const { selectedSongId, activeLyricIndex } = this.state;
    if (!selectedSongId || activeLyricIndex < 0) {
      return;
    }

    const activeButton = this.lyricsList.querySelector<HTMLButtonElement>(`.control-lyrics-item[data-index="${activeLyricIndex}"]`);
    if (activeButton) {
      activeButton.classList.add("is-active");
      this.adjustScrollForActiveLyric(activeButton);
    }
  }

  private adjustScrollForActiveLyric(button: HTMLButtonElement): void {
    const container = this.lyricsList;
    const parentHeight = container.clientHeight;
    if (parentHeight <= 0 || container.scrollHeight <= parentHeight) {
      return;
    }

    const currentScrollTop = container.scrollTop;
    const maxScrollTop = container.scrollHeight - parentHeight;

    const itemHeight = button.offsetHeight || 0;
    const itemTop = button.offsetTop;
    const itemBottom = itemTop + itemHeight;

    let targetScroll = currentScrollTop;

    const minimumTop = Math.max(itemTop - itemHeight, 0);
    const preferredTop = Math.max(itemTop - parentHeight * 0.35, 0);
    const requiredBottom = itemBottom + itemHeight * 2;

    if (itemTop < currentScrollTop + itemHeight) {
      targetScroll = minimumTop;
    } else if (itemTop > currentScrollTop + parentHeight / 2) {
      targetScroll = preferredTop;
    }

    if (requiredBottom > targetScroll + parentHeight) {
      targetScroll = requiredBottom - parentHeight;
    }

    targetScroll = Math.min(Math.max(targetScroll, 0), maxScrollTop);

    if (Math.abs(targetScroll - currentScrollTop) > 1) {
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }

  private triggerLyric(songId: string, index: number): void {
    const song = this.lyrics.songMap.get(songId);
    const line = song?.lines[index];
    if (!line) {
      return;
    }
    this.store.showLyric({ songId, index: line.order, text: line.text });
  }

  private advanceLyric(): void {
    const { selectedSongId } = this.state;
    if (!selectedSongId) {
      return;
    }
    const song = this.lyrics.songMap.get(selectedSongId);
    if (!song || song.lines.length === 0) {
      return;
    }
    const nextIndex = this.state.activeLyricIndex + 1;
    if (nextIndex >= song.lines.length) {
      return;
    }
    this.triggerLyric(selectedSongId, nextIndex);
  }

  private applyManualMessage(): void {
    const value = this.manualInput.value;
    this.store.setManualMessage(value);
  }

  private syncFromState(state: ParameterState): void {
    if (document.activeElement !== this.manualInput) {
      if (this.manualInput.value !== state.manualMessage) {
        this.manualInput.value = state.manualMessage;
      }
    }

    if (document.activeElement !== this.fadeSlider) {
      const sliderValue = Number.parseInt(this.fadeSlider.value, 10);
      if (sliderValue !== state.fadeDurationMs) {
        this.fadeSlider.value = String(state.fadeDurationMs);
      }
      this.updateFadeLabel(state.fadeDurationMs);
    }

    this.syncMovementSelection(state.movementId);

    if (state.selectedSongId) {
      this.songSelect.value = state.selectedSongId;
    } else if (this.songSelect.value !== "") {
      this.songSelect.value = "";
    }

    this.renderLyricsList(state.selectedSongId);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.key === "Enter") {
      const isTyping = activeElement && (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT");
      if (!isTyping) {
        event.preventDefault();
        this.advanceLyric();
      }
      return;
    }
  }

  private updateFadeLabel(durationMs: number): void {
    this.fadeValue.textContent = `${(durationMs / 1000).toFixed(1)}s`;
    this.fadeBpm.textContent = this.formatBpm(durationMs);
  }

  private syncMovementSelection(movementId: MovementId): void {
    this.movementRadios.forEach((input, id) => {
      const checked = id === movementId;
      input.checked = checked;
      input.parentElement?.classList.toggle("is-active", checked);
    });
  }

  private formatBpm(durationMs: number): string {
    if (durationMs <= 0) {
      return "参考BPM --";
    }
    const beatsPerCycle = 2; // 1サイクルを2拍換算してBPMを見積もる
    const bpm = (60_000 * beatsPerCycle) / durationMs;
    return `参考BPM ${bpm.toFixed(1)}`;
  }
}
