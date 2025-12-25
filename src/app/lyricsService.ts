export type LyricLine = {
  order: number;
  lineNumber: number;
  text: string;
};

export type SongLyrics = {
  id: string;
  title: string;
  lines: LyricLine[];
  defaultFontId?: string;
  defaultMovementId?: string;
};

export type LyricsLibrary = {
  songs: SongLyrics[];
  songMap: Map<string, SongLyrics>;
};

type LyricsManifest = {
  songs: Array<{
    title?: string;
    file: string;
    defaultFontId?: string;
    defaultMovementId?: string;
  }>;
};

const MANIFEST_SOURCE = "/data/manifest.json";

const parseCsv = (raw: string): string[][] => {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const pushCell = () => {
    current.push(value);
    value = "";
  };

  const pushRow = () => {
    if (current.length > 0 || value.length > 0) {
      pushCell();
      rows.push(current);
      current = [];
    }
  };

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (char === "\"") {
      const next = raw[i + 1];
      if (inQuotes && next === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && raw[i + 1] === "\n") {
        i += 1;
      }
      pushRow();
      continue;
    }

    value += char;
  }

  pushRow();
  return rows;
};

const slugify = (value: string): string => {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
};

const resolveDataUrl = (file: string): string => {
  const segments = file
    .split("/")
    .map((segment) => encodeURIComponent(segment.trim()))
    .filter((segment) => segment.length > 0);

  return `/data/${segments.join("/")}`;
};

const parseLyricFile = (raw: string): LyricLine[] => {
  const rows = parseCsv(raw)
    .map((row) => (row.length > 0 ? row[0].trim() : ""))
    .filter((cell) => cell.length > 0);

  if (rows.length === 0) {
    return [];
  }

  const hasHeader = rows[0].toLowerCase() === "lyric";
  const lyrics = hasHeader ? rows.slice(1) : rows;

  return lyrics.map((text, index) => ({
    order: index,
    lineNumber: index + 1,
    text,
  }));
};

const buildSongId = (entry: { title?: string; file: string }, fallbackIndex: number): string => {
  if (entry.title?.trim()) {
    const byTitle = slugify(entry.title);
    if (byTitle) {
      return byTitle;
    }
  }

  const withoutExtension = entry.file.replace(/\.csv$/i, "");
  const byFile = slugify(withoutExtension);
  if (byFile) {
    return byFile;
  }

  return `song_${fallbackIndex}`;
};

const buildSongTitle = (entry: { title?: string; file: string }): string => {
  if (entry.title?.trim()) {
    return entry.title.trim();
  }

  const withoutExtension = entry.file.replace(/\.csv$/i, "");
  return withoutExtension
    .split(/[\/]/g)
    .pop()!
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const loadSongFromEntry = async (entry: { title?: string; file: string; defaultFontId?: string; defaultMovementId?: string }, index: number): Promise<SongLyrics | null> => {
  const fileUrl = resolveDataUrl(entry.file);
  const response = await fetch(fileUrl, { cache: "no-store" });
  if (!response.ok) {
    console.warn(`Failed to load lyrics file: ${entry.file}`);
    return null;
  }

  const text = await response.text();
  const lines = parseLyricFile(text);
  if (lines.length === 0) {
    console.warn(`Lyrics file is empty: ${entry.file}`);
    return null;
  }

  const song: SongLyrics = {
    id: buildSongId(entry, index),
    title: buildSongTitle(entry),
    lines,
  };

  if (entry.defaultFontId) {
    song.defaultFontId = entry.defaultFontId;
  }
  if (entry.defaultMovementId) {
    song.defaultMovementId = entry.defaultMovementId;
  }

  return song;
};


export const loadLyricsLibrary = async (): Promise<LyricsLibrary> => {
  const manifestResponse = await fetch(MANIFEST_SOURCE, { cache: "no-store" });
  if (!manifestResponse.ok) {
    throw new Error(`Failed to load lyrics manifest: ${manifestResponse.status}`);
  }

  const manifest = (await manifestResponse.json()) as LyricsManifest;
  const entries = Array.isArray(manifest?.songs) ? manifest.songs : [];

  if (entries.length === 0) {
    return { songs: [], songMap: new Map() };
  }

  const songs = (await Promise.all(entries.map((entry, index) => loadSongFromEntry(entry, index))))
    .filter((song): song is SongLyrics => Boolean(song))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    songs,
    songMap: new Map(songs.map((song) => [song.id, song])),
  };
};
