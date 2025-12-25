import type { ParameterStore, ParameterState, MovementId, FontId, DisplayMode } from "../core/parameterStore";
import { DEFAULT_FONT_VALUE, DEFAULT_MOVEMENT_VALUE } from "../core/parameterStore";
import type { LyricsLibrary } from "./lyricsService";
import { TelemetryChannel, type TelemetryEvent } from "../core/telemetry";
import { movements } from "../movements";
import { getFontCatalog, getFontById, ensureFontLoaded } from "../core/fontRegistry";

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
  private readonly tempoSlider: HTMLInputElement;
  private readonly tempoValue: HTMLSpanElement;
  private readonly tempoBeatInfo: HTMLSpanElement;
  private readonly tapTempoButton: HTMLButtonElement;
  private tapTempoActiveTimeout: number | null;
  private readonly fontSelect: HTMLSelectElement;
  private readonly fontPreview: HTMLElement;

  private readonly displayModeButtons: Map<DisplayMode, HTMLButtonElement>;
  private readonly movementRadios: Map<string, HTMLInputElement>;
  private readonly unsubscribe: () => void;
  private readonly panelStates: WeakMap<HTMLElement, PanelMetrics>;
  private readonly infoFpsValue: HTMLSpanElement;
  private readonly infoClockValue: HTMLSpanElement;
  private readonly infoKeyValue: HTMLSpanElement;
  private readonly globalKeyListener: (event: KeyboardEvent) => void;
  private readonly handleWindowBlur: () => void;
  private readonly isMacPlatform: boolean;
  private state: ParameterState;
  private renderedSongId: string | null;
  private telemetryUnsubscribe: (() => void) | null;
  private clockTimerId: number | null;
  private fpsResetTimerId: number | null;
  private zIndexCounter: number;
  private activeInteractions: number;
  private originalCursor: string;
  private originalUserSelect: string;
  private tapTempoSamples: number[];

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
    this.tapTempoSamples = [];
    this.displayModeButtons = new Map();
    this.isMacPlatform = this.detectMacPlatform();

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
      const opened = window.open(url, "_blank");
      if (opened) {
        opened.opener = null;
        return;
      }
      window.alert("ポップアップがブロックされました。ブラウザの設定で許可してください。");
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
    const keyMetric = this.createInfoMetric("入力キー", {
      valueClassName: "control-info-value control-info-value--keys",
    });
    this.infoKeyValue = keyMetric.value;

    infoGrid.append(fpsMetric.container, clockMetric.container, keyMetric.container);
    infoSection.append(infoTitle, infoGrid);

    const infoPanel = this.createPanel("info", infoSection);

    this.handleWindowBlur = () => {
      this.resetKeyDisplay();
    };

    this.globalKeyListener = (event) => {
      this.onKeyDown(event);
      this.handleKeyDown(event);
    };

    const movementSection = document.createElement("section");
    movementSection.className = "control-params control-movements";

    const movementTitle = document.createElement("h2");
    movementTitle.textContent = "動き選択";

    const movementList = document.createElement("div");
    movementList.className = "control-movements-list";

    // Add default option first
    const defaultMovementItem = document.createElement("label");
    defaultMovementItem.className = "control-movements-item";
    if (this.state.useDefaultMovement) {
      defaultMovementItem.classList.add("is-active");
    }

    const defaultMovementInput = document.createElement("input");
    defaultMovementInput.type = "radio";
    defaultMovementInput.name = "control-movement";
    defaultMovementInput.value = DEFAULT_MOVEMENT_VALUE;
    defaultMovementInput.title = "デフォルト";
    defaultMovementInput.checked = this.state.useDefaultMovement;

    defaultMovementInput.addEventListener("change", () => {
      if (defaultMovementInput.checked) {
        this.store.setUseDefaultMovement(true);
        this.syncMovementSelection(DEFAULT_MOVEMENT_VALUE);
      }
    });

    const defaultMovementLabel = document.createElement("span");
    defaultMovementLabel.className = "control-movements-label";
    defaultMovementLabel.textContent = "デフォルト";

    defaultMovementItem.append(defaultMovementInput, defaultMovementLabel);
    movementList.appendChild(defaultMovementItem);
    this.movementRadios.set(DEFAULT_MOVEMENT_VALUE, defaultMovementInput);

    movements.forEach((movement) => {
      const item = document.createElement("label");
      item.className = "control-movements-item";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "control-movement";
      input.value = movement.id;
      input.title = movement.label;
      if (!this.state.useDefaultMovement && movement.id === this.state.movementId) {
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

    this.syncMovementSelection(this.state.useDefaultMovement ? DEFAULT_MOVEMENT_VALUE : this.state.movementId);

    movementSection.append(movementTitle, movementList);


    const movementPanel = this.createPanel("movement", movementSection);

    const tempoSection = document.createElement("section");
    tempoSection.className = "control-params control-params--compact";

    const tempoTitle = document.createElement("h2");
    tempoTitle.textContent = "テンポ設定";

    const tempoLabel = document.createElement("label");
    tempoLabel.className = "control-params-range";

    const tempoCaption = document.createElement("span");
    tempoCaption.textContent = "BPM";

    const tempoControls = document.createElement("div");
    tempoControls.className = "control-params-range-controls";

    this.tempoSlider = document.createElement("input");
    this.tempoSlider.type = "range";
    this.tempoSlider.min = "40";
    this.tempoSlider.max = "240";
    this.tempoSlider.step = "1";
    this.tempoSlider.value = String(this.state.tempoBpm);

    this.tempoValue = document.createElement("span");
    this.tempoValue.className = "control-params-range-value";

    tempoControls.append(this.tempoSlider, this.tempoValue);

    const tempoBeatInfo = document.createElement("span");
    tempoBeatInfo.className = "control-params-range-bpm";

    this.tapTempoButton = document.createElement("button");
    this.tapTempoButton.type = "button";
    this.tapTempoButton.className = "control-tap-tempo secondary";
    this.tapTempoButton.textContent = "タップテンポ";
    this.tapTempoActiveTimeout = null;

    tempoLabel.append(tempoCaption, tempoControls);
    this.tempoBeatInfo = tempoBeatInfo;
    tempoSection.append(tempoTitle, tempoLabel, this.tapTempoButton, tempoBeatInfo);

    const tempoPanel = this.createPanel("tempo", tempoSection);

    this.updateTempoLabel(this.state.tempoBpm);

    const fontSection = document.createElement("section");
    fontSection.className = "control-params control-fonts";

    const fontTitle = document.createElement("h2");
    fontTitle.textContent = "フォント";

    const fontLabel = document.createElement("label");
    fontLabel.className = "control-fonts-label";

    this.fontSelect = document.createElement("select");
    this.fontSelect.className = "control-fonts-select";
    this.fontSelect.setAttribute("aria-label", "フォント選択");

    // Add default option first
    const defaultFontOption = document.createElement("option");
    defaultFontOption.value = DEFAULT_FONT_VALUE;
    defaultFontOption.textContent = "デフォルト";
    this.fontSelect.appendChild(defaultFontOption);

    getFontCatalog().forEach((font) => {
      const option = document.createElement("option");
      option.value = font.id;
      option.textContent = font.label;
      this.fontSelect.appendChild(option);
    });
    this.fontSelect.value = this.state.useDefaultFont ? DEFAULT_FONT_VALUE : this.state.fontId;

    fontLabel.append(this.fontSelect);

    this.fontPreview = document.createElement("div");
    this.fontPreview.className = "control-fonts-preview";
    this.fontPreview.textContent = "Aa あア 123";
    this.applyFontPreview(this.state.fontId);
    void ensureFontLoaded(getFontById(this.state.fontId));


    fontSection.append(fontTitle, fontLabel, this.fontPreview);


    const fontPanel = this.createPanel("font", fontSection);

    const displaySection = document.createElement("section");
    displaySection.className = "control-params control-display";

    const displayTitle = document.createElement("h2");
    displayTitle.textContent = "表示モード";

    const displayButtons = document.createElement("div");
    displayButtons.className = "control-display-buttons";

    const displayModes: Array<{ id: DisplayMode; label: string }> = [
      { id: "lyrics", label: "歌詞" },
      { id: "logo", label: "ロゴ" },
      { id: "blank", label: "非表示" },
    ];

    displayModes.forEach(({ id, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "control-display-button";
      button.textContent = label;
      button.addEventListener("click", () => {
        if (this.state.displayMode !== id) {
          this.store.setDisplayMode(id);
        }
      });
      if (this.state.displayMode === id) {
        button.classList.add("is-active");
      }
      displayButtons.appendChild(button);
      this.displayModeButtons.set(id, button);
    });

    displaySection.append(displayTitle, displayButtons);

    const displayPanel = this.createPanel("display", displaySection);

    const leftColumn = document.createElement("div");
    leftColumn.className = "control-column control-column--left";
    leftColumn.append(this.previewPanel, infoPanel, displayPanel);

    const centerColumn = document.createElement("div");
    centerColumn.className = "control-column control-column--center";
    centerColumn.append(tempoPanel, fontPanel, movementPanel);

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

    this.tempoSlider.addEventListener("input", () => {
      const bpm = Number.parseInt(this.tempoSlider.value, 10);
      if (!Number.isNaN(bpm)) {
        this.updateTempoLabel(bpm);
      }
    });

    this.tempoSlider.addEventListener("change", () => {
      const bpm = Number.parseInt(this.tempoSlider.value, 10);
      if (!Number.isNaN(bpm)) {
        this.store.setTempoBpm(bpm);
        this.tapTempoSamples = [];
      }
    });

    this.fontSelect.addEventListener("change", () => {
      const selectedValue = this.fontSelect.value;
      if (selectedValue === DEFAULT_FONT_VALUE) {
        this.store.setUseDefaultFont(true);
      } else {
        const fontId = selectedValue as FontId;
        const font = getFontById(fontId);
        this.applyFontPreview(fontId);
        void ensureFontLoaded(font);
        this.store.setFont(fontId);
      }
    });


    this.tapTempoButton.addEventListener("click", () => {
      this.handleTapTempo();
      this.flashTapTempoButton();
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

    this.ensureInitialSongSelection();

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

    window.addEventListener("keydown", this.globalKeyListener);
    window.addEventListener("blur", this.handleWindowBlur);
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
    window.removeEventListener("keydown", this.globalKeyListener);
    window.removeEventListener("blur", this.handleWindowBlur);
    this.telemetryUnsubscribe?.();
    if (this.clockTimerId !== null) {
      window.clearInterval(this.clockTimerId);
      this.clockTimerId = null;
    }
    if (this.fpsResetTimerId !== null) {
      window.clearTimeout(this.fpsResetTimerId);
      this.fpsResetTimerId = null;
    }
    if (this.tapTempoActiveTimeout !== null) {
      window.clearTimeout(this.tapTempoActiveTimeout);
      this.tapTempoActiveTimeout = null;
    }
    this.resetKeyDisplay();
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

  private createInfoMetric(
    label: string,
    options?: { valueClassName?: string },
  ): { container: HTMLElement; value: HTMLSpanElement } {
    const container = document.createElement("div");
    container.className = "control-info-item";

    const caption = document.createElement("span");
    caption.className = "control-info-label";
    caption.textContent = label;

    const value = document.createElement("span");
    value.className = options?.valueClassName ?? "control-info-value";
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

  private onKeyDown(event: KeyboardEvent): void {
    if (!document.hasFocus()) {
      return;
    }

    const representation = this.formatKeyEvent(event);
    if (!representation) {
      return;
    }

    this.infoKeyValue.textContent = representation;
  }

  private resetKeyDisplay(): void {
    this.infoKeyValue.textContent = "--";
  }

  private formatKeyEvent(event: KeyboardEvent): string {
    const modifiers: string[] = [];

    if (event.ctrlKey) {
      modifiers.push(this.isMacPlatform ? "Control" : "Ctrl");
    }
    if (event.metaKey) {
      modifiers.push(this.isMacPlatform ? "Command" : "Meta");
    }
    if (event.altKey) {
      modifiers.push(this.isMacPlatform ? "Option" : "Alt");
    }
    if (event.shiftKey) {
      modifiers.push("Shift");
    }

    const keyName = this.normalizeKeyName(event.key);
    if (!keyName && modifiers.length === 0) {
      return "";
    }

    const isModifierOnly = keyName !== "" && modifiers.some((modifier) => modifier.toLowerCase() === keyName.toLowerCase());
    const parts = modifiers.slice();

    if (!isModifierOnly && keyName) {
      parts.push(keyName);
    }

    return parts.join(" + ") || keyName;
  }

  private normalizeKeyName(key: string): string {
    if (!key) {
      return "";
    }

    const replacements: Record<string, string> = {
      " ": "Space",
      Escape: "Esc",
      ArrowUp: "Arrow Up",
      ArrowDown: "Arrow Down",
      ArrowLeft: "Arrow Left",
      ArrowRight: "Arrow Right",
      Enter: "Enter",
      Backspace: "Backspace",
      Tab: "Tab",
      Delete: "Delete",
      PageUp: "Page Up",
      PageDown: "Page Down",
      Home: "Home",
      End: "End",
      Meta: this.isMacPlatform ? "Command" : "Meta",
      Control: this.isMacPlatform ? "Control" : "Ctrl",
      Alt: this.isMacPlatform ? "Option" : "Alt",
      Shift: "Shift",
      CapsLock: "Caps Lock",
    };

    const replacement = replacements[key];
    if (replacement) {
      return replacement;
    }

    if (/^f\d{1,2}$/i.test(key)) {
      return key.toUpperCase();
    }

    if (key.length === 1) {
      return key.toUpperCase();
    }

    return key.replace(/^[a-z]/, (char) => char.toUpperCase());
  }

  private detectMacPlatform(): boolean {
    if (typeof navigator === "undefined") {
      return false;
    }

    const platform = navigator.platform?.toLowerCase() ?? "";
    if (platform.includes("mac")) {
      return true;
    }

    const userAgent = navigator.userAgent?.toLowerCase() ?? "";
    return userAgent.includes("mac os");
  }

  private populateSongOptions(): void {
    this.lyrics.songs.forEach((song) => {
      const option = document.createElement("option");
      option.value = song.id;
      option.textContent = song.title;
      this.songSelect.appendChild(option);
    });
  }

  private ensureInitialSongSelection(): void {
    if (this.lyrics.songs.length === 0) {
      return;
    }

    const desiredSongId = this.state.selectedSongId ?? this.lyrics.songs[0]?.id ?? null;
    if (!desiredSongId) {
      return;
    }

    if (this.state.selectedSongId !== desiredSongId) {
      this.store.selectSong(desiredSongId);
      this.state = this.store.getState();
    }

    this.songSelect.value = desiredSongId;
    this.renderLyricsList(desiredSongId);
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
    this.canvasHost.focus();
  }

  private mapMovementHotkey(key: string): number | null {
    switch (key) {
      case "1":
        return 0;
      case "2":
        return 1;
      case "3":
        return 2;
      case "4":
        return 3;
      case "5":
        return 4;
      case "6":
        return 5;
      case "7":
        return 6;
      case "8":
        return 7;
      case "9":
        return 8;
      case "0":
        return 9;
      default:
        return null;
    }
  }

  private mapDisplayModeHotkey(key: string): DisplayMode | null {
    switch (key) {
      case "z":
        return "lyrics";
      case "x":
        return "logo";
      case "c":
        return "blank";
      default:
        return null;
    }
  }

  private mapFontHotkey(key: string): FontId | null {
    const keyOrder: readonly string[] = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
    const index = keyOrder.indexOf(key);
    if (index === -1) {
      return null;
    }

    const catalog = getFontCatalog();
    const font = catalog[index];
    return font?.id ?? null;
  }

  private selectMovementByIndex(index: number): void {
    const movement = movements[index];
    if (!movement) {
      return;
    }

    this.store.setMovement(movement.id as MovementId);
  }

  private syncFromState(state: ParameterState): void {
    if (document.activeElement !== this.manualInput) {
      if (this.manualInput.value !== state.manualMessage) {
        this.manualInput.value = state.manualMessage;
      }
    }

    if (document.activeElement !== this.tempoSlider) {
      const sliderValue = Number.parseInt(this.tempoSlider.value, 10);
      if (sliderValue !== state.tempoBpm) {
        this.tempoSlider.value = String(state.tempoBpm);
      }
      this.updateTempoLabel(state.tempoBpm);
      if (this.tapTempoSamples.length > 0 && sliderValue !== state.tempoBpm) {
        this.tapTempoSamples = [];
      }
    }

    const expectedFontValue = state.useDefaultFont ? DEFAULT_FONT_VALUE : state.fontId;
    if (this.fontSelect.value !== expectedFontValue) {
      this.fontSelect.value = expectedFontValue;
      if (!state.useDefaultFont) {
        this.applyFontPreview(state.fontId);
        void ensureFontLoaded(getFontById(state.fontId));
      }
    }


    const expectedMovementValue = state.useDefaultMovement ? DEFAULT_MOVEMENT_VALUE : state.movementId;
    this.syncMovementSelection(expectedMovementValue);
    this.syncDisplayModeSelection(state.displayMode);

    if (state.selectedSongId) {
      this.songSelect.value = state.selectedSongId;
    } else if (this.songSelect.value !== "") {
      this.songSelect.value = "";
    }

    this.renderLyricsList(state.selectedSongId);
  }

  private syncDisplayModeSelection(mode: DisplayMode): void {
    this.displayModeButtons.forEach((button, id) => {
      const isActive = id === mode;
      button.classList.toggle("is-active", isActive);
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const activeElement = document.activeElement as HTMLElement | null;
    const isTyping = Boolean(activeElement && (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT"));

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "Enter") {
      if (!isTyping) {
        event.preventDefault();
        this.advanceLyric();
      }
      return;
    }

    if (isTyping) {
      return;
    }

    const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (normalizedKey === "p") {
      if (!event.repeat) {
        event.preventDefault();
        this.handleTapTempo();
        this.flashTapTempoButton();
      }
    }

    const displayModeHotkey = this.mapDisplayModeHotkey(normalizedKey);
    if (displayModeHotkey) {
      if (!event.repeat) {
        event.preventDefault();
        if (this.state.displayMode !== displayModeHotkey) {
          this.store.setDisplayMode(displayModeHotkey);
        }
      }
      return;
    }

    const fontId = this.mapFontHotkey(normalizedKey);
    if (fontId) {
      if (!event.repeat && this.state.fontId !== fontId) {
        event.preventDefault();
        this.store.setFont(fontId);
      }
      return;
    }

    const movementIndex = this.mapMovementHotkey(event.key);
    if (movementIndex === null) {
      return;
    }

    if (movementIndex >= movements.length) {
      return;
    }

    event.preventDefault();
    this.selectMovementByIndex(movementIndex);
  }

  private updateTempoLabel(bpm: number): void {
    const sanitizedBpm = Number.isFinite(bpm) ? Math.max(1, bpm) : 120;
    this.tempoValue.textContent = `${sanitizedBpm.toFixed(0)} BPM`;
    const msPerBeat = 60000 / sanitizedBpm;
    this.tempoBeatInfo.textContent = `1拍 ≈ ${(msPerBeat / 1000).toFixed(2)}s`;
  }

  private handleTapTempo(): void {
    const now = performance.now();
    const samples = this.tapTempoSamples;

    if (samples.length > 0) {
      const delta = now - samples[samples.length - 1];
      if (delta > 2000) {
        samples.length = 0;
      }
    }

    samples.push(now);

    if (samples.length > 8) {
      samples.splice(0, samples.length - 8);
    }

    if (samples.length < 2) {
      return;
    }

    const first = samples[0];
    const last = samples[samples.length - 1];
    const span = last - first;
    if (span <= 0) {
      return;
    }

    const averageInterval = span / (samples.length - 1);
    if (!Number.isFinite(averageInterval) || averageInterval <= 0) {
      return;
    }

    const computedBpm = Math.round(60000 / averageInterval);
    if (!Number.isFinite(computedBpm) || computedBpm <= 0) {
      return;
    }

    const sliderMin = Number.parseInt(this.tempoSlider.min, 10) || 1;
    const sliderMax = Number.parseInt(this.tempoSlider.max, 10) || 400;
    const clamped = Math.min(sliderMax, Math.max(sliderMin, computedBpm));

    this.tempoSlider.value = String(clamped);
    this.updateTempoLabel(clamped);
    this.store.setTempoBpm(clamped);
  }

  private flashTapTempoButton(): void {
    this.tapTempoButton.classList.add("is-active");

    if (this.tapTempoActiveTimeout !== null) {
      window.clearTimeout(this.tapTempoActiveTimeout);
    }

    this.tapTempoActiveTimeout = window.setTimeout(() => {
      this.tapTempoButton.classList.remove("is-active");
      this.tapTempoActiveTimeout = null;
    }, 200);
  }

  private applyFontPreview(fontId: FontId): void {
    const font = getFontById(fontId);
    this.fontPreview.style.fontFamily = font.family;
  }

  private syncMovementSelection(movementId: MovementId): void {
    this.movementRadios.forEach((input, id) => {
      const checked = id === movementId;
      input.checked = checked;
      input.parentElement?.classList.toggle("is-active", checked);
    });
  }
}
