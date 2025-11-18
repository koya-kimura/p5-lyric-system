import { ParameterStore } from "../core/parameterStore";
import { ControlPanel } from "./controlPanel";
import { loadLyricsLibrary } from "./lyricsService";
import type { LyricsLibrary, SongLyrics } from "./lyricsService";
import { TelemetryChannel } from "../core/telemetry";
import { loadFontCatalog } from "../core/fontRegistry";
import { renderUsageGuide } from "./usageGuide";

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

  const titleButton = document.createElement("button");
  titleButton.type = "button";
  titleButton.className = "app-header__title-button";
  titleButton.textContent = "p5 Lyric System";
  titleButton.setAttribute("aria-label", "制御画面に戻る");
  title.appendChild(titleButton);

  const nav = document.createElement("nav");
  nav.className = "app-header__nav";

  const controlTab = document.createElement("button");
  controlTab.type = "button";
  controlTab.className = "app-header__nav-button is-active";
  controlTab.textContent = "制御画面";
  controlTab.setAttribute("aria-current", "page");

  const usageTab = document.createElement("button");
  usageTab.type = "button";
  usageTab.className = "app-header__nav-button";
  usageTab.textContent = "使い方";

  nav.append(controlTab, usageTab);
  header.append(title, nav);

  const main = document.createElement("div");
  main.className = "app-main";

  const controlHost = document.createElement("div");
  controlHost.className = "app-main__view app-main__view--control";

  const usageHost = document.createElement("div");
  usageHost.className = "app-main__view app-main__view--usage";
  usageHost.hidden = true;

  renderUsageGuide(usageHost);

  main.append(controlHost, usageHost);

  root.append(header, main);

  let lyricsLibrary: LyricsLibrary;
  try {
    lyricsLibrary = await loadLyricsLibrary();
  } catch (error) {
    console.error(error);
    lyricsLibrary = createEmptyLibrary();
  }

  const panel = new ControlPanel({
    root: controlHost,
    store,
    performanceUrl,
    lyrics: lyricsLibrary,
    telemetry,
  });

  const layout = panel.getContext();
  layout.canvasParent.replaceChildren();

  const setView = (view: "control" | "usage") => {
    if (view === "control") {
      controlHost.hidden = false;
      usageHost.hidden = true;
      controlTab.classList.add("is-active");
      controlTab.setAttribute("aria-current", "page");
      usageTab.classList.remove("is-active");
      usageTab.removeAttribute("aria-current");
    } else {
      controlHost.hidden = true;
      usageHost.hidden = false;
      usageTab.classList.add("is-active");
      usageTab.setAttribute("aria-current", "page");
      controlTab.classList.remove("is-active");
      controlTab.removeAttribute("aria-current");
    }
  };

  controlTab.addEventListener("click", () => {
    setView("control");
  });

  usageTab.addEventListener("click", () => {
    setView("usage");
  });

  titleButton.addEventListener("click", () => {
    setView("control");
  });

  return {
    role,
    layout,
    store,
    telemetry,
  };
};
