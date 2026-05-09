# 🗄️ CreatorShelf

NASに保存された投稿者別の動画・画像をブラウザから快適に閲覧するメディアビューアです。

投稿者ごとに整理されたメディアライブラリを、直感的なUIで閲覧・検索・お気に入り登録できます。動画はHTTP Range Requestによるストリーミング再生、画像は高速ビューアで表示します。

---

## ✨ 主な機能

| 機能 | 説明 |
|---|---|
| 📂 投稿者別整理 | NAS内のフォルダ構成から自動的に投稿者を認識・分類 |
| 🔍 自動スキャン | 定期スキャンで新しいメディアを自動検出 (FFmpeg, Pillow 活用) |
| 🎬 動画プレイヤー | HTTP Range Request 対応のストリーミング動画再生 |
| 🖼️ 画像ビューア | 高速ローディング対応の画像ビューア |
| 🎞️ スライドショー | 画像を自動的にスライドショー再生 |
| ❤️ いいね/お気に入り | お気に入り機能で重要メディアをマーク |
| 📊 統計ダッシュボード | 投稿者数・メディア数の統計をホーム画面に表示 |
| 🛠️ 管理画面 | スキャンの実行、設定の確認など |

## 🏗️ アーキテクチャ

<pre>
┌──────────────────────────────────────────────────────────────────────┐
│                        ブラウザ (Next.js)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ ホーム        │ │ 動画プレイヤー │ │ 画像ビューア  │ │ 管理画面        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
└──────────────────────────────────────────────┬───────────────────────┘
                                                │ REST API (HTTP)
┌──────────────────────────────────────────────┼───────────────────────┐
│                     Backend (FastAPI)                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ /api/creators       │ │ /api/media │ │ /api/videos  │ │ /api/admin    │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ サムネイル │ │ ストリー │ │ スキャン │                │
│  │ 生成       │ │ ミング   │ │ サービス │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
└──────────────────────────────────────────────┬───────────────────────┘
                                                │
              ┌─────────────┬───────────┬─────────┐
              ▼                 ▼           ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐
      │  SQLite  DB  │ │  FS スキャン  │ │ サムネイル   │
      │           │ │          │ │  キャッシュ   │
      └───────────┘   └───────────┘   └───────────┘
              ▲                ▲                ▲
              └─────────────┴───────────┴─────────┘
                        NAS マウント先
              (VIDEO_ROOT_HOST / PHOTO_ROOT_HOST)
</pre>

## 🚀 クイックスタート

### 1. .env ファイルの作成

```bash
cp .env.example .env
```

環境変数を NAS のマウント先に合わせて編集します:

```env
VIDEO_ROOT_HOST=/mnt/nas/mp4
PHOTO_ROOT_HOST=/mnt/nas/photo

# カンマ区切りで複数パスを指定可能
VIDEO_ROOTS=/mnt/nas/mp4/video1,/mnt/nas/mp4/video2
PHOTO_ROOTS=/mnt/nas/photo1,/mnt/nas/photo2
```

### 2. コンテナを起動する

```bash
docker compose up -d --build
```

### 3. ブラウザでアクセス

```
http://localhost:3000
```

## 📁 プロジェクト構造

<pre>
creator-shelf/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI アプリケーション
│   │   ├── models.py         # SQLAlchemy モデル
│   │   ├── schemas.py        # Pydantic スキーマ
│   │   ├── database.py       # DB接続
│   │   ├── routers/          # APIルーター
│   │   │   ├── creators.py   # 投稿者API
│   │   │   ├── media.py      # メディアAPI
│   │   │   ├── photos.py     # 画像API
│   │   │   ├── videos.py     # 動画API
│   │   │   └── admin.py      # 管理API
│   │   └── services/         # ビジネスロジック
│   │       ├── scanner.py    # NASスキャン
│   │       ├── streaming.py  # ストリーミング
│   │       ├── thumbnail.py  # サムネイル生成
│   │       └── txt_parser.py # .nfoパーサー
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx          # ホーム画面
│   │   ├── creators/         # 投稿者関連画面
│   │   ├── video/[id]/       # 動画プレイヤー
│   │   ├── photo/[id]/       # 画像ビューア
│   │   ├── slideshow/[id]/   # スライドショー
│   │   ├── favorites/        # お気に入り
│   │   ├── admin/            # 管理画面
│   │   └── globals.css
│   ├── components/           # UIコンポーネント
│   │   ├── CreatorDetailPanel.tsx
│   │   ├── PhotoViewerOverlay.tsx
│   │   ├── RecentCreators.tsx
│   │   ├── RecentMedia.tsx
│   │   ├── StatsBar.tsx
│   │   └── VideoPlayerOverlay.tsx
│   ├── lib/                  # ユーティリティ
│   │   ├── api.ts
│   │   └── useSwipe.ts
│   ├── package.json
│   └── Dockerfile
├── .env.example
├── docker-compose.yml
├── docker-compose.override.yml  # 開発用オーバーライド
└── README.md
</pre>

## 📺 画面一覧

| 画面 | URL |
|---|-|
| ホーム | `/` |
| 投稿者一覧 | `/creators` |
| 投稿者詳細 | `/creators/[id]` |
| 動画プレイヤー | `/video/[id]` |
| 画像ビューア | `/photo/[id]` |
| スライドショー | `/slideshow/[id]` |
| お気に入り | `/favorites` |
| 管理 | `/admin` |

## ⚙️ 環境変数

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `VIDEO_ROOT_HOST` | NAS動画のマウント先 | `/mnt/nas/mp4` |
| `PHOTO_ROOT_HOST` | NAS画像のマウント先 | `/mnt/nas/photo` |
| `VIDEO_ROOTS` | カンマ区切り動画パス | `${VIDEO_ROOT_HOST}` |
| `PHOTO_ROOTS` | カンマ区切り画像パス | `${PHOTO_ROOT_HOST}` |
| `DATABASE_PATH` | SQLite DBのパス | `/app/data/app.db` |
| `THUMBNAIL_DIR` | サムネイルキャッシュディレクトリ | `/app/cache/thumbnails` |
| `SCAN_INTERVAL_MINUTES` | 自動スキャン間隔 (分) | `60` |
| `TZ` | タイムゾーン | `Asia/Tokyo` |

## 📡 APIエンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/api/health` | ヘルスチェック |
| `GET` | `/api/creators` | 投稿者一覧取得 |
| `GET` | `/api/creators/{id}` | 投稿者詳細取得 |
| `GET` | `/api/media` | メディア一覧取得 |
| `GET` | `/api/photos` | 画像一覧取得 |
| `GET` | `/api/videos/{id}/stream` | 動画ストリーミング配信 |
| `POST` | `/api/admin/scan` | 手動NASスキャン実行 |

### スキャンの実行例

```bash
curl -X POST http://localhost:8080/api/admin/scan
```

## 💻 開発

### ローカル環境での開発

```bash
# バックエンド
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8080

# フロントエンド
cd frontend
npm install
npm run dev
```

### Dockerでの開発

```bash
docker compose up --build
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

### テスト

```bash
# バックエンド
cd backend
pytest

# フロントエンド (TypeScript)
cd frontend
npx tsc --noEmit
```

## 🛠️ 運用コマンド

```bash
# 手動スキャン
curl -X POST http://localhost:8080/api/admin/scan

# コンテナ再起動
docker compose restart

# ログ確認
docker compose logs -f backend  # バックエンド
docker compose logs -f frontend # フロントエンド
```

## 🧰 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フロントエンド | Next.js 14, React 18, Tailwind CSS, TypeScript |
| バックエンド | FastAPI, SQLAlchemy, SQLite |
| Docker | docker-compose, Alpine Linux |
| OS | Linux |
| CMS | CreatorShelf (自作) |
