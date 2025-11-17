import { ParameterStore } from "../core/parameterStore";
import { ControlPanel } from "./controlPanel";
import { loadLyricsLibrary } from "./lyricsService";
import type { LyricsLibrary, SongLyrics } from "./lyricsService";
import { TelemetryChannel } from "../core/telemetry";
import { loadFontCatalog } from "../core/fontRegistry";

export type ClientRole = "control" | "perform";

export type LayoutContext = {
  canvasParent: HTMLElement;
  getCanvasSize: () => { width: number; height: number };
};

export type AppContext = {
  role: ClientRole;
  layout: LayoutContext;
  store: ParameterStore;
  telemetry: TelemetryChannel;
};

const resolveClientRole = (): ClientRole => {
  const current = new URL(window.location.href);
  const roleParam = current.searchParams.get("role");
  return roleParam === "perform" ? "perform" : "control";
};

const buildPerformanceUrl = (): string => {
  const target = new URL(window.location.href);
  target.searchParams.set("role", "perform");
  return target.toString();
};

const ensureAppRoot = (): HTMLElement => {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element.");
  }
  root.replaceChildren();
  return root;
};

const createEmptyLibrary = (): LyricsLibrary => ({
  songs: [],
  songMap: new Map<string, SongLyrics>(),
});

const setupPerformLayout = (): LayoutContext => {
  document.body.classList.add("role-perform");
  const root = ensureAppRoot();

  const container = document.createElement("div");
  container.className = "perform-canvas";
  root.appendChild(container);

  return {
    canvasParent: container,
    getCanvasSize: () => ({ width: window.innerWidth, height: window.innerHeight }),
  };
};

export const bootstrapClient = async (): Promise<AppContext> => {
  const role = resolveClientRole();
  const performanceUrl = buildPerformanceUrl();
  await loadFontCatalog();
  const store = new ParameterStore();
  const telemetry = new TelemetryChannel();

  if (role === "perform") {
    const layout = setupPerformLayout();
    layout.canvasParent.replaceChildren();
    return { role, layout, store, telemetry };
  }

  document.body.classList.add("role-control");
  const root = ensureAppRoot();

  const header = document.createElement("header");
  header.className = "app-header";

  const title = document.createElement("h1");
  title.className = "app-header__title";
  title.textContent = "P5 Lyric System";

  header.appendChild(title);

  const main = document.createElement("div");
  main.className = "app-main";

  root.append(header, main);

  let lyricsLibrary: LyricsLibrary;
  try {
    lyricsLibrary = await loadLyricsLibrary();
  } catch (error) {
    console.error(error);
    lyricsLibrary = createEmptyLibrary();
  }

  const panel = new ControlPanel({
    root: main,
    store,
    performanceUrl,
    lyrics: lyricsLibrary,
    telemetry,
  });

  const layout = panel.getContext();
  layout.canvasParent.replaceChildren();

  return {
    role,
    layout,
    store,
    telemetry,
  };
};
