# CreatorShelf

NASに保存された投稿者別の動画・画像をブラウザから快適に閲覧するメディアビューアです。

## 起動方法

### 1. `.env` を作成する

```bash
cp .env.example .env
```

NASのマウント先に合わせて編集します:

```env
VIDEO_ROOT_HOST=/mnt/nas/mp4
PHOTO_ROOT_HOST=/mnt/nas/photo
```

### 2. コンテナを起動する

```bash
docker compose up -d --build
```

### 3. ブラウザでアクセス

```
http://localhost:3000
```

## 手動スキャン

```bash
curl -X POST http://localhost:8080/api/admin/scan
```

## 画面構成

| 画面 | URL |
|---|---|
| ホーム | `/` |
| 投稿者一覧 | `/creators` |
| 投稿者詳細 | `/creators/[id]` |
| 動画プレイヤー | `/video/[id]` |
| 画像ビューア | `/photo/[id]` |
| スライドショー | `/slideshow/[id]` |
| お気に入り | `/favorites` |
| 管理 | `/admin` |

## 技術構成

- **フロントエンド**: Next.js 14 / React / Tailwind CSS
- **バックエンド**: FastAPI / SQLAlchemy / SQLite
- **動画配信**: HTTP Range Request
- **サムネイル**: FFmpeg (動画) / Pillow (画像)
- **実行環境**: Docker Compose
