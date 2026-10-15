"""data/ 資料夾共用的小工具：路徑、讀寫 JSON、格式常數。只用 Python 內建功能。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

DATA_FORMAT = "labor-pixie-data"
BUNDLE_FORMAT = "labor-pixie-bundle"
FORMAT_VERSION = 1


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dumps(obj):
    """固定寫法（排序不動、兩格縮排、結尾換行），同樣內容永遠產生同樣的檔案。"""
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def write_json(path, obj):
    """內容沒變就不寫，回傳是否有寫入。"""
    path = Path(path)
    text = dumps(obj)
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def data_files(data_dir=DATA):
    """data/ 底下所有檔案（相對路徑、固定順序）。"""
    data_dir = Path(data_dir)
    return sorted(p for p in data_dir.rglob("*") if p.is_file())
