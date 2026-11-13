"""Download pinned Hugging Face files and run them locally; no hosted inference."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "model-config.json").read_text())
MODEL = ROOT / ".models" / "qwen3-8b-4bit"
MANIFEST = ROOT / ".models" / "model-manifest.json"


def require_runtime():
    try:
        installed = importlib.metadata.version("mlx-lm")
    except importlib.metadata.PackageNotFoundError:
        raise SystemExit("Install requirements-mlx.txt in this lab's .venv first.")
    if installed != CONFIG["runtime_version"]:
        raise SystemExit(f"Expected mlx-lm {CONFIG['runtime_version']}; found {installed}.")


def download():
    require_runtime()
    from huggingface_hub import HfApi, snapshot_download

    info = HfApi(token=False).model_info(CONFIG["repository"], revision=CONFIG["revision"])
    if info.sha != CONFIG["revision"]:
        raise SystemExit("The Hub did not resolve the expected pinned revision.")
    snapshot_download(
        repo_id=CONFIG["repository"], revision=CONFIG["revision"], token=False,
        local_dir=MODEL, cache_dir=ROOT / ".models" / "hub-cache",
    )
    files = {}
    for path in sorted(MODEL.rglob("*")):
        if not path.is_file() or ".cache" in path.relative_to(MODEL).parts:
            continue
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        files[str(path.relative_to(MODEL))] = {"bytes": path.stat().st_size, "sha256": digest.hexdigest()}
    if not any(name.endswith(".safetensors") for name in files) or "tokenizer_config.json" not in files:
        raise SystemExit("The model snapshot is incomplete; no ready manifest was written.")
    receipt = {"recorded_utc": datetime.now(timezone.utc).isoformat(), "repository": CONFIG["repository"],
               "revision": info.sha, "python": platform.python_version(), "machine": platform.machine(),
               "packages": {name: importlib.metadata.version(name) for name in ["mlx-lm", "mlx", "huggingface-hub", "transformers"]},
               "files": files, "inference_performed": False}
    MANIFEST.write_text(json.dumps(receipt, indent=2) + "\n")
    print("Pinned files downloaded and hashed. This is not an inference or training result.")


def prepared_model():
    require_runtime()
    if not MANIFEST.is_file():
        raise SystemExit("Run setup_mlx.py download first; no model manifest exists.")
    receipt = json.loads(MANIFEST.read_text())
    if receipt["repository"] != CONFIG["repository"] or receipt["revision"] != CONFIG["revision"]:
        raise SystemExit("The downloaded model identity differs from model-config.json.")
    for name, metadata in receipt["files"].items():
        path = MODEL / name
        if not path.is_file() or path.stat().st_size != metadata["bytes"]:
            raise SystemExit(f"Missing or size-mismatched model file: {name}")
    return receipt


def smoke():
    prepared_model()
    from mlx_lm import load, generate

    started = time.perf_counter()
    model, tokenizer = load(str(MODEL))
    question = "Reply with just READY."
    prompt = tokenizer.apply_chat_template(
        [{"role": "user", "content": question}], tokenize=False,
        add_generation_prompt=True, enable_thinking=False,
    )
    answer = generate(model, tokenizer, prompt=prompt, max_tokens=16, verbose=False)
    receipt = {"recorded_utc": datetime.now(timezone.utc).isoformat(),
               "kind": "One direct MLX text smoke run; not tool evaluation or a benchmark",
               "repository": CONFIG["repository"], "revision": CONFIG["revision"],
               "question": question, "answer": answer, "max_tokens": 16,
               "wall_seconds": time.perf_counter() - started,
               "inference_performed": True, "weights_changed": False,
               "answer_quality": "not_evaluated"}
    directory = ROOT / "data" / "runs"
    directory.mkdir(parents=True, exist_ok=True)
    name = "direct-smoke-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json"
    with (directory / name).open("x") as result:
        result.write(json.dumps(receipt, indent=2) + "\n")
    print(answer)
    print(f"Saved the smoke record to data/runs/{name}")


def serve():
    prepared_model()
    executable = Path(sys.executable).parent / "mlx_lm.server"
    print("Loading pinned local Qwen files with MLX. No Ollama or hosted inference.", flush=True)
    os.execv(executable, [str(executable), "--model", str(MODEL), "--host", "127.0.0.1", "--port", "8080",
                         "--max-tokens", "256", "--chat-template-args", '{"enable_thinking":false}'])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["download", "smoke", "serve"])
    args = parser.parse_args()
    {"download": download, "smoke": smoke, "serve": serve}[args.command]()
