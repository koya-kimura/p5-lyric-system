const createList = (items: string[]): HTMLUListElement => {
  const list = document.createElement("ul");
  list.className = "usage-guide__list";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  return list;
};

const createShortcutList = (pairs: Array<{ key: string; description: string }>): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "usage-guide__shortcuts";

  pairs.forEach((pair) => {
    const row = document.createElement("div");
    row.className = "usage-guide__shortcut-row";

    const key = document.createElement("span");
    key.className = "usage-guide__shortcut-key";
    key.textContent = pair.key;

    const description = document.createElement("span");
    description.className = "usage-guide__shortcut-description";
    description.textContent = pair.description;

    row.append(key, description);
    container.appendChild(row);
  });

  return container;
};

export const renderUsageGuide = (root: HTMLElement): void => {
  root.replaceChildren();

  const article = document.createElement("article");
  article.className = "usage-guide";

  const title = document.createElement("h1");
  title.className = "usage-guide__title";
  title.textContent = "使い方ガイド";
  article.appendChild(title);

  const intro = document.createElement("p");
  intro.className = "usage-guide__lead";
  intro.textContent = "この画面では歌詞表示システムの基本操作とショートカットを確認できます。ライブ前のリハーサルやオペレーション引き継ぎ時に参照してください。";
  article.appendChild(intro);

  const basics = document.createElement("section");
  basics.className = "usage-guide__section";
  const basicsHeading = document.createElement("h2");
  basicsHeading.textContent = "制御画面の基本";
  basics.appendChild(basicsHeading);
  basics.appendChild(createList([
    "左カラムでプレビューとインフォメーションを確認できます。キー入力の状態もここで確認できます。",
    "中央カラムでテンポ、フォント、カラー、動きを設定します。フォント変更は即座にパフォーマンス画面へ反映されます。",
    "右カラムの曲リストから歌詞を選択し、クリックまたは Enter キーで次の行へ送出できます。手動テキスト欄から任意のメッセージを強制表示することもできます。",
  ]));
  article.appendChild(basics);

  const shortcuts = document.createElement("section");
  shortcuts.className = "usage-guide__section";
  const shortcutsHeading = document.createElement("h2");
  shortcutsHeading.textContent = "キーボードショートカット";
  shortcuts.appendChild(shortcutsHeading);
  shortcuts.appendChild(createShortcutList([
    { key: "Enter", description: "現在の曲で次の歌詞を表示" },
    { key: "1〜0", description: "動きプリセット 0〜9 を切り替え" },
    { key: "Q〜P", description: "フォントプリセットを切り替え" },
    { key: "P", description: "タップテンポ (押下時にボタンが点灯)" },
    { key: "Z / X / C", description: "表示モードを 歌詞 / ロゴ / 非表示 に切り替え" },
  ]));
  article.appendChild(shortcuts);

  const styleSection = document.createElement("section");
  styleSection.className = "usage-guide__section";
  const styleHeading = document.createElement("h2");
  styleHeading.textContent = "フォントとカラー";
  styleSection.appendChild(styleHeading);
  styleSection.appendChild(createList([
    "フォントセレクタは manifest.json に登録されたフォント順に並びます。Q〜P ショートカットもこの順序に対応します。",
    "カラーは 16 進数で管理され、プレビューの見本とインフォメーション内のキー表示で即時に確認できます。",
    "複数端末で制御画面を開いた場合も BroadcastChannel 経由で設定が同期されます。",
  ]));
  article.appendChild(styleSection);

  const displayModes = document.createElement("section");
  displayModes.className = "usage-guide__section";
  const displayHeading = document.createElement("h2");
  displayHeading.textContent = "表示モード";
  displayModes.appendChild(displayHeading);
  displayModes.appendChild(createList([
    "歌詞モード: 通常の歌詞アニメーションを表示します。",
    "ロゴモード: 指定されたロゴ画像を中央に表示します。",
    "非表示モード: 出力を完全に消灯します。トラブル時の待機などに使用します。",
  ]));
  article.appendChild(displayModes);

  const tips = document.createElement("section");
  tips.className = "usage-guide__section";
  const tipsHeading = document.createElement("h2");
  tipsHeading.textContent = "トラブルシューティング";
  tips.appendChild(tipsHeading);
  tips.appendChild(createList([
    "歌詞が表示されない場合は曲が選択されているか、表示モードが歌詞になっているか確認してください。",
    "タップテンポが安定しない場合は 2 秒以上間隔を空けると記録がリセットされます。",
    "フォントが読み込まれない場合は manifest.json のパスとファイルの配置を確認し、再読み込みしてください。",
  ]));
  article.appendChild(tips);

  root.appendChild(article);
};
