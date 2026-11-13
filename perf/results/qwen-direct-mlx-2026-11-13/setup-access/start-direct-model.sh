#!/usr/bin/env bash
set -euo pipefail

qwen_lab_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -x "$qwen_lab_dir/.venv/bin/python" ]]; then
  python3 -m venv "$qwen_lab_dir/.venv"
fi

# A failed lookup must not be mistaken for proof that a package does not exist.
"$qwen_lab_dir/.venv/bin/python" - <<'PY'
from urllib.request import urlopen

for name, url in [
    ("PyPI", "https://pypi.org/pypi/mlx-lm/0.32.2/json"),
    ("Hugging Face", "https://huggingface.co/mlx-community/Qwen3-8B-4bit"),
]:
    try:
        with urlopen(url, timeout=15) as response:
            response.read(1)
    except Exception as error:
        raise SystemExit(f"Cannot reach {name}: {error}. Setup stopped before installation/download.")
print("Package and model indexes are reachable. Starting isolated setup.")
PY

"$qwen_lab_dir/.venv/bin/python" -m pip install \
  --disable-pip-version-check --no-cache-dir --retries 0 --timeout 30 \
  --index-url https://pypi.org/simple -r "$qwen_lab_dir/requirements-mlx.txt"
"$qwen_lab_dir/.venv/bin/python" "$qwen_lab_dir/setup_mlx.py" download
"$qwen_lab_dir/.venv/bin/python" "$qwen_lab_dir/setup_mlx.py" smoke
