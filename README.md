# spot-design-kit

Claude Code に入れると、**画面・LP・レポート・デモ・ダッシュボードを頼んだときに、最初の版から同じ品質で出てくる**ようになるプラグインです。

中身は「スキル」1つです。Claude が画面づくりの依頼を受けると自動でこのスキルを読み、

1. ページの型（レポート / デモ / ダッシュボード / LP）を決め
2. 実際に評価の高かった画面から作ったテンプレをコピーして中身を差し替え
3. 色・余白・文字・ダークモード・スマホ対応の作法に沿って組み
4. Playwright で検査（コントラスト・横スクロール・タップ領域・JSエラー・AIっぽさの兆候）して、
   PC/スマホ × ライト/ダークのスクショを自分で見てから報告

します。指示文に「デザインを整えて」と書く必要はありません。

---

## 導入（どれか1つ）

### A. いちばん簡単: Claude Code の中で2行（GitHub に置いてある場合）

Claude Code を開いて、次の2行をそのまま入力します。

```
/plugin marketplace add jamworksfujiki-jpg/spot-design-kit
/plugin install spot-design@spot-design-kit
```

入れたら Claude Code を一度終了して開き直します。更新が出たときは `/plugin marketplace update spot-design-kit`。

> 公開リポジトリ: https://github.com/jamworksfujiki-jpg/spot-design-kit （GitHub アカウントが無くても入れられます）

### B. ZIP やフォルダでもらった場合

1. もらったフォルダの中の `plugins/spot-design/skills/spot-design` フォルダをコピーします
2. 次のどちらかに貼り付けます
   - 自分のPCの全プロジェクトで使う: `C:\Users\<あなたの名前>\.claude\skills\spot-design`（Mac は `~/.claude/skills/spot-design`）
   - そのプロジェクトのメンバー全員で使う: プロジェクトの `.claude/skills/spot-design`（git にコミットすれば全員に配られる）
3. Claude Code を開き直します

### C. 試しに一度だけ使う

```
claude --plugin-dir <このフォルダ>/plugins/spot-design
```

### 検査を動かす準備（作業するプロジェクトで1回だけ）

検査スクリプトは Playwright を使います。Node.js 18 以上が必要です。

```
npm i -D playwright
npx playwright install chromium
```

---

## 入ったか確かめる

Claude Code で次のように頼みます。

```
社内勉強会のアンケート結果をレポートにして。数字は仮でいい
```

返事の中に「レポート型で組みました」「検査 FAIL 0件」のような報告があれば効いています。
効いていないときは `/skills`（または `/plugin`）で `spot-design` が一覧にあるか見てください。

---

## 使い方のコツ

指示に入れると仕上がりが上がるもの:

- **誰が読むか**（例: 上司・取引先・従業員10〜50人の会社の総務担当）
- **読んだ人にしてほしいこと**（例: 未連絡の会社に今週連絡する・無料相談を申し込む）
- **数字は出典つきで渡す**。無い数字は Claude に作らせない
- ブランドの指定（無ければスポット社労士くんの配色）

検査だけ単独で動かすこともできます。

```
node <スキルのフォルダ>/scripts/check-design.mjs https://example.com
node <スキルのフォルダ>/scripts/check-design.mjs ./index.html
```

---

## 中身

```
plugins/spot-design/skills/spot-design/
  SKILL.md                 Claude が最初に読む指示（手順・非交渉・禁止事項）
  references/
    principles.md          なぜこう見えるか（14原則・AIっぽさの排除）
    page-types.md          型ごとの構成
    brands.md              色とブランド（spot / internal / neutral）
    components.md          部品のクラス早見表
  templates/
    report.html            レポート型（分析・アンケート・月次報告）
    demo.html              デモ型（操作説明・営業用の疑似体験）
    dashboard.html         ダッシュボード型（社内の監視・一覧）
    lp.html                LP型（サービス紹介・料金）
  scripts/
    check-design.mjs       Playwright 検査
```

テンプレの会社名・料金・数字はすべて見本です。

## 更新するとき（管理者向け）

1. スキルのファイルを直す
2. `plugins/spot-design/.claude-plugin/plugin.json` と `.claude-plugin/marketplace.json` の `version` を上げる
3. `claude plugin validate .` が通ることを確かめて push
