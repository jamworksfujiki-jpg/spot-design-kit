# 部品の早見表

テンプレに入っている部品と、そのまま使えるクラス名。新しい部品を作る前に、ここにある物で足りないか確かめる。

## 共通

| 部品 | クラス | 仕様 |
|---|---|---|
| 英字ラベル | `.eyebrow` / `.sec-head .k` | 12px・700・`letter-spacing:.08em`・`--cyan-ink` |
| 章見出し | `.sec-head` | 左罫 6px シアン＋英字ラベル＋h2(24px/900) |
| 主ボタン | `.btn` | 高さ 48px・インク地・2px 枠・角丸 4px |
| 副ボタン | `.btn.sub` | 透明地・インク枠 |
| 小ボタン | `.tbtn` / `.ghost` | 高さ 44px・1px 枠 |
| pill フィルタ | `.filters button[aria-pressed]` | 高さ 44px・`999px`・選択中はインク地反転・件数を等幅で |
| チップ | `.chip.k-*` | 12px・700・`999px`。状態ごとに色を固定 |
| 表 | `.tbl > table` | 外枠 1px・見出し行は面色 12px・数字列 `.r` 右寄せ等幅 |

## レポート（report.html）

| 部品 | クラス | 用途 |
|---|---|---|
| 表紙 | `.cover` | 上に黄色 8px の帯 |
| 数字カード | `.kpis > .kpi(.hot)` | 上罫 4px。`.hot` はマゼンタで1枚だけ |
| 目次 | `nav.toc` | sticky・横スクロール |
| 結論カード | `.findings > .finding(.key)` | `.key` はインク地反転で1枚だけ |
| 積み上げ帯 | `.stack-row > .stack > span.c-*` | 構成比。`role="img"` と `aria-label` に数値 |
| 横棒 | `.hbars > .hbar(.hl)` | 項目比較。`.hl` はマゼンタで1本だけ |
| 読み取り | `.insight` | 淡シアン面＋「読み取り」タグ。図の直後に必ず置く |
| 打ち手 | `.actions > .action` + `.w-now/.w-week/.w-next` | マゼンタ=今すぐ・黄=今週・シアン=来月 |

## デモ（demo.html）

| 部品 | クラス | 用途 |
|---|---|---|
| DEMO 帯 | `.demo-bar` | sticky・インク地・黄色の DEMO タグ |
| ステップ | `.steps button[aria-current="step"]` | 下に 3px のシアン |
| 2列 | `.row > .main + .bubble` | 右 300px。900px 未満で縦積み |
| 吹き出し | `.bubble` + `b.k` | 黄色地・三角矢印・黒地の小タグ |
| アプリ枠 | `.app > .app-head + .app-body` | 実際の画面に見せる白い枠 |
| 進捗 | `.progress > i` + `.clist li.done` | `role="progressbar"` |
| 判定 | `.verdict` / `.tiles > .tile.d/.w/.o` | 直すべき・確認したい・問題なし |
| 問題の行 | `.issue(.w)` | 左罫 4px＋`.sev` バッジ |
| 申込カード | `.cta-grid > .cta(.main)` | 主は 2px 枠。料金はマゼンタ |

## ダッシュボード（dashboard.html）

| 部品 | クラス | 用途 |
|---|---|---|
| 鮮度表示 | `.fresh(.stale)` | 一番古いデータ源の時刻。24時間超で赤 |
| KPI | `button.kpi` + `style="--tone:..."` | 上罫 3px・押すと該当パネルへ |
| レベル | `.lv.lv-1〜4` | 最優先/高/中/確認。文字で必ず書く |
| 要対応の行 | `.item` + `--tone` | 左に 4px の色バー・本文2行で切る |
| スパークライン | `svg.spark[data-v][data-c]` | 線 1.6px＋面 12%＋末尾の点 |
| ドロワー | `.drawer > aside` | 右から・Esc と背景クリックで閉じる |

## LP（lp.html）

| 部品 | クラス | 用途 |
|---|---|---|
| ヘッダーボタン | `.hbtn.su` / `.hbtn.li` | はじめて `#F95A4C` / ログイン `#2864F0` |
| 3色ヒーロー | `.hero > .c/.y/.m` | サービス名・料金・一言・ボタン |
| 料金 | `.price` | clamp(36px,5vw,56px)・900・単位は小さく |
| 実績 | `.stats > .stat` | 数字＋「○年○月現在」 |
| サービスカード | `.cards > .card.c/.y/.m` | 色面ヘッダー＋白い本文＋下揃えのボタン |
| 流れ | `ol.steps` | STEP 番号の黒タグ＋上罫 4px |
| FAQ | `.faq details` | Q を左に・高さ 56px |
