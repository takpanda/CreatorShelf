from pathlib import Path


def parse_video_txt(file_path: str) -> dict | None:
    """
    動画ファイルと同名の .txt ファイルを解析して、タイトル・投稿日時・説明文を返す。

    フォーマット:
      1行目: タイトル
      2行目: 空行
      3行目: 投稿日時
      4行目〜: 説明文（「変更・削除」を含む行の直前まで）
    """
    txt_path = Path(file_path).with_suffix(Path(file_path).suffix + ".txt")
    if not txt_path.exists():
        return None
    try:
        text = txt_path.read_text(encoding="utf-8")
    except Exception:
        try:
            text = txt_path.read_text(encoding="utf-8-sig")
        except Exception:
            return None

    lines = text.splitlines()
    title = lines[0].strip() if len(lines) > 0 else ""
    posted_at = lines[2].strip() if len(lines) > 2 else ""

    description_lines: list[str] = []
    for line in lines[3:]:
        if "変更・削除" in line:
            break
        description_lines.append(line.rstrip())

    # 末尾の空行を除去
    while description_lines and not description_lines[-1].strip():
        description_lines.pop()

    description = "\n".join(description_lines).strip()

    return {
        "video_title": title or None,
        "video_posted_at": posted_at or None,
        "video_description": description or None,
    }


def parse_photo_txt(file_path: str) -> dict | None:
    """
    画像ファイルのグループIDに対応する .txt ファイルを解析して、タイトル・説明文を返す。

    ファイル命名規則:
      {group_id}_{datetime}_{random}.jpg  （例: 245123_20250708_051833_YufD.jpg）
      {group_id}_{title}.txt              （例: 245123_フェラ好きな妻.txt）

    フォーマット（txt内容）:
      1行目〜「削除・修正」の前行まで: 画像の説明文
    """
    p = Path(file_path)
    stem = p.stem  # e.g. "245123_20250708_051833_YufD"
    parts = stem.split("_", 1)
    if len(parts) < 1:
        return None
    group_id = parts[0]
    if not group_id.isdigit():
        return None

    txt_files = list(p.parent.glob(f"{group_id}_*.txt"))
    if not txt_files:
        return None
    txt_path = txt_files[0]

    # タイトル = txt ファイル名のステムから "{group_id}_" を除いた部分
    title = txt_path.stem[len(group_id) + 1:]

    try:
        text = txt_path.read_text(encoding="utf-8")
    except Exception:
        try:
            text = txt_path.read_text(encoding="utf-8-sig")
        except Exception:
            return None

    lines = text.splitlines()
    description_lines: list[str] = []
    for line in lines:
        if "削除・修正" in line:
            break
        description_lines.append(line.rstrip())

    # 末尾の空行を除去
    while description_lines and not description_lines[-1].strip():
        description_lines.pop()

    description = "\n".join(description_lines).strip()

    return {
        "photo_title": title or None,
        "photo_description": description or None,
    }
