# vendor/

外部から取り込んだライブラリを置く場所です。

## pdf.js (pdfjs-dist)

給与明細PDFからテキストを読み取るために使っています。

- `pdf.min.mjs` / `pdf.worker.min.mjs` … pdfjs-dist の legacy ビルド
- バージョンは `pdfjs-VERSION.txt` を参照
- ライセンス: Apache License 2.0（`pdfjs-LICENSE.txt`）
- 配布元: https://github.com/mozilla/pdf.js

**CDNから読み込まずに同梱しているのは意図的です。**
このアプリは「外部に接続するのは祝日の自動取得だけ」を約束しているため、
PDFを扱うたびに第三者のCDNへ接続するのは避けています。
同梱しておけばオフラインでも解析できます。

読み込むのは利用者がPDF取り込みを開いた時だけで、
通常の利用では読み込まれません（約1.8MBあるため）。

## `.nojekyll` を消さないでください

GitHub Pages は既定で Jekyll を通してサイトを生成しますが、
**Jekyll は `vendor/` を既定で除外します**。リポジトリ直下の `.nojekyll` が
無くなると、このフォルダが公開されずPDF取り込みだけが動かなくなります。
