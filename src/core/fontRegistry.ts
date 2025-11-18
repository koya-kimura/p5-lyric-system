import type p5 from "p5";

export type FontId = string;

export type FontDefinition = {
  id: FontId;
  label: string;
  /** CSS font-family name to use when rendering. */
  family: string;
  /** Optional font source to register via the FontFace API. */
  source?: string;
  /** Optional descriptors passed to the FontFace constructor when source is provided. */
  descriptors?: FontFaceDescriptors;
};

type FontManifestEntry = {
  id?: unknown;
  label?: unknown;
  family?: unknown;
  source?: unknown;
  descriptors?: unknown;
};

type FontManifest = {
  fonts?: FontManifestEntry[];
};

const FONT_MANIFEST_PATH = "/font/manifest.json";

const FALLBACK_CATALOG: readonly FontDefinition[] = Object.freeze([
  {
    id: "LINESeedJP",
    label: "LINE Seed JP",
    family: "'LINE Seed JP'",
    source: "/font/book/LINESeedJP_TTF_Bd.ttf",
    descriptors: {
      style: "normal",
      weight: "700",
    },
  },
]);

let catalog: readonly FontDefinition[] = FALLBACK_CATALOG;
let catalogPromise: Promise<readonly FontDefinition[]> | null = null;

const fontMap = new Map<FontId, FontDefinition>(catalog.map((font) => [font.id, font]));
const loadedFamilies = new Set<string>();
const loadedP5Fonts = new Map<FontId, p5.Font>();

const sanitizeEntry = (entry: FontManifestEntry | null | undefined): FontDefinition | null => {
  if (!entry) {
    return null;
  }

  const id = typeof entry.id === "string" ? entry.id.trim() : undefined;
  const label = typeof entry.label === "string" ? entry.label.trim() : undefined;
  const family = typeof entry.family === "string" ? entry.family.trim() : undefined;

  if (!id || !label || !family) {
    return null;
  }

  const definition: FontDefinition = {
    id,
    label,
    family,
  };

  if (typeof entry.source === "string" && entry.source.trim() !== "") {
    definition.source = entry.source.trim();
  }

  if (entry.descriptors && typeof entry.descriptors === "object") {
    definition.descriptors = entry.descriptors as FontFaceDescriptors;
  }

  return definition;
};

const applyCatalog = (next: readonly FontDefinition[]): void => {
  const merged: FontDefinition[] = [];
  const seenIds = new Set<FontId>();

  const pushFont = (font: FontDefinition) => {
    if (seenIds.has(font.id)) {
      return;
    }
    merged.push(font);
    seenIds.add(font.id);
  };

  next.forEach((font) => pushFont(font));
  FALLBACK_CATALOG.forEach((font) => pushFont(font));

  catalog = Object.freeze(merged.slice());
  fontMap.clear();
  catalog.forEach((font) => {
    fontMap.set(font.id, font);
  });
};

export const loadFontCatalog = async (): Promise<readonly FontDefinition[]> => {
  if (catalogPromise) {
    return catalogPromise;
  }

  catalogPromise = (async () => {
    try {
      const response = await fetch(FONT_MANIFEST_PATH, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Font manifest request failed with status ${response.status}`);
      }

      const manifest = (await response.json()) as FontManifest;
      const entries = Array.isArray(manifest.fonts)
        ? manifest.fonts
            .map(sanitizeEntry)
            .filter((font): font is FontDefinition => font !== null)
        : [];

      if (entries.length > 0) {
        applyCatalog(entries);
      } else {
        applyCatalog(FALLBACK_CATALOG);
      }
    } catch (error) {
      console.warn("Failed to load font manifest, using fallback catalog", error);
      applyCatalog(FALLBACK_CATALOG);
    }

    return catalog;
  })();

  return catalogPromise;
};

export const getFontCatalog = (): readonly FontDefinition[] => catalog;

export const getDefaultFontId = (): FontId => catalog[0]?.id ?? FALLBACK_CATALOG[0].id;

export const getFontById = (id: FontId): FontDefinition => fontMap.get(id) ?? catalog[0] ?? FALLBACK_CATALOG[0];

export const ensureFontLoaded = async (font: FontDefinition): Promise<void> => {
  if (typeof document === "undefined") {
    return;
  }

  const primaryFamily = font.family.split(",", 1)[0]?.trim() ?? font.family;
  if (loadedFamilies.has(primaryFamily)) {
    return;
  }

  if (font.source && "FontFace" in window) {
    try {
      const face = new FontFace(primaryFamily.replace(/^['"]|['"]$/g, ""), `url(${font.source})`, font.descriptors);
      await face.load();
      document.fonts.add(face);
    } catch (error) {
      console.warn(`Failed to load font source for ${font.id}`, error);
    }
  }

  if ("fonts" in document) {
    try {
      await document.fonts.load(`16px ${primaryFamily}`);
    } catch {
      // ignore
    }
  }

  loadedFamilies.add(primaryFamily);
};

const loadFontResource = (p: p5, font: FontDefinition): Promise<void> => {
  if (!font.source || loadedP5Fonts.has(font.id)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    p.loadFont(
      font.source!,
      (resource) => {
        loadedP5Fonts.set(font.id, resource);
        resolve();
      },
      (error) => {
        console.warn(`Failed to load p5 font for ${font.id}`, error);
        resolve();
      },
    );
  });
};

export const preloadFontsWithP5 = async (p: p5): Promise<void> => {
  const fonts = await loadFontCatalog();

  await Promise.all(fonts.map(async (font) => {
    await ensureFontLoaded(font);
    await loadFontResource(p, font);
  }));
};

export const getP5FontById = (id: FontId): p5.Font | undefined => loadedP5Fonts.get(id);
