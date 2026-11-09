#!/usr/bin/env python3
"""Benchmark local Zola serving, preserve every run, and fail on threshold misses."""

import argparse
import hashlib
import io
import json
import os
import platform
import re
import socket
import subprocess
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def command(*args, **kwargs):
    return subprocess.run(args, cwd=ROOT, check=True, **kwargs)


def get(url):
    with urllib.request.urlopen(url, timeout=10) as response:
        return response.status, response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline-ref", required=True)
    parser.add_argument("--port", type=int, default=1121)
    args = parser.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = ROOT / "perf" / "results" / (stamp + "-learning")
    output.mkdir(parents=True, exist_ok=False)
    current_commit = command("git", "rev-parse", "HEAD", capture_output=True, text=True).stdout.strip()
    baseline_commit = command("git", "rev-parse", args.baseline_ref, capture_output=True, text=True).stdout.strip()
    source_files = sorted(
        p for folder in ("content", "templates", "static")
        for p in (ROOT / folder).rglob("*") if p.is_file()
    ) + [ROOT / "zola.toml"]
    digest = hashlib.sha256()
    for path in source_files:
        digest.update(path.relative_to(ROOT).as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    machine = json.loads(command("node", "-e", "const o=require('node:os');console.log(JSON.stringify({platform:o.platform(),release:o.release(),arch:o.arch(),cpu:o.cpus()[0]?.model,logical_cpus:o.cpus().length,memory_bytes:o.totalmem()}))", capture_output=True, text=True).stdout)
    result = {
        "started_utc": stamp, "commit": current_commit,
        "baseline_commit": baseline_commit,
        "source_sha256": digest.hexdigest(),
        "working_tree_status": command("git", "status", "--short", capture_output=True, text=True).stdout.splitlines(),
        "machine": machine,
        "zola": command("zola", "--version", capture_output=True, text=True).stdout.strip(),
        "scope": "Local Zola development server, HTTP/1.1 keepalive. Not Cloudflare capacity or production evidence.",
        "thresholds": {"failed_requests": 0, "non_2xx_responses": 0, "minimum_rps": 500, "maximum_p99_ms": 1000, "homepage_rps_ratio_min": 0.75, "homepage_p99_ratio_max": 2, "homepage_p99_allowance_ms": 25},
        "phases": [], "checks": [], "passed": False,
    }
    processes = []
    logs = []

    def save():
        (output / "result.json").write_text(json.dumps(result, indent=2) + "\n")

    def start(root, port, label):
        log = (output / (label + "-server.log")).open("w")
        logs.append(log)
        process = subprocess.Popen(["zola", "--root", str(root), "serve", "--interface", "127.0.0.1", "--port", str(port), "--output-dir", str(scratch / (label + "-public"))], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
        processes.append(process)
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError(label + " server failed; inspect its log")
            try:
                status, body = get(f"http://127.0.0.1:{port}/")
                if status == 200 and b"404human" in body:
                    return f"http://127.0.0.1:{port}"
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(0.1)
        raise RuntimeError(label + " server readiness timed out")

    def check(name, passed, detail):
        result["checks"].append({"name": name, "passed": passed, "detail": detail})
        save()
        if not passed:
            raise RuntimeError(name + ": " + str(detail))

    def phase(label, base, path, count, concurrency):
        run = subprocess.run(["ab", "-n", str(count), "-c", str(concurrency), "-k", "-r", "-s", "10", base + path], capture_output=True, text=True)
        (output / (label + ".txt")).write_text(run.stdout + "\n" + run.stderr)

        def number(pattern, default=None):
            match = re.search(pattern, run.stdout, re.MULTILINE)
            return float(match.group(1)) if match else default

        values = {
            "name": label, "path": path, "requests": count, "concurrency": concurrency,
            "exit_code": run.returncode,
            "completed": number(r"^Complete requests:\s+(\d+)"),
            "failed": number(r"^Failed requests:\s+(\d+)"),
            "non_2xx": number(r"^Non-2xx responses:\s+(\d+)", 0),
            "rps": number(r"^Requests per second:\s+([\d.]+)"),
            "p95_ms": number(r"^\s*95%\s+(\d+)"),
            "p99_ms": number(r"^\s*99%\s+(\d+)"),
            "seconds": number(r"^Time taken for tests:\s+([\d.]+)"),
        }
        result["phases"].append(values)
        save()
        print(json.dumps(values), flush=True)
        check(label, run.returncode == 0 and values["completed"] == count and values["failed"] == 0 and values["non_2xx"] == 0 and values["rps"] >= 500 and values["p99_ms"] <= 1000, values)
        return values

    save()
    try:
        with tempfile.TemporaryDirectory(prefix="404human-learning-load-") as directory:
            scratch = Path(directory)
            baseline = scratch / "baseline"
            baseline.mkdir()
            archive = command("git", "archive", baseline_commit, capture_output=True).stdout
            with tarfile.open(fileobj=io.BytesIO(archive)) as contents:
                contents.extractall(baseline, filter="data")
            baseline_url = start(baseline, args.port, "baseline")
            candidate_url = start(ROOT, args.port + 1, "candidate")
            expected = {
                "/learn/": b"Learning",
                "/learn/model-engineering/": b"Chapters, in order",
                "/learn/model-engineering/roadmap/": b"The model-engineering learning roadmap",
                "/learn/model-engineering/weights-predictions-and-loss/": b"Weights, predictions, and loss",
                "/learn/model-engineering/gradients-and-weight-updates/": b"Gradients and weight updates",
                "/learn/model-engineering/our-first-training-loop/": b"Our first training loop",
                "/learn/model-engineering/how-learning-goes-wrong/": b"How learning goes wrong",
                "/learn/model-engineering/the-harness-around-the-model/": b"The harness around the model",
                "/posts/why-im-learning-how-models-learn/": b"Why I",
            }
            for route, marker in expected.items():
                status, body = get(candidate_url + route)
                check("content " + route, status == 200 and marker in body, {"status": status, "bytes": len(body)})
            base = phase("baseline-home", baseline_url, "/", 50000, 32)
            candidate = phase("candidate-home", candidate_url, "/", 50000, 32)
            check("homepage regression", candidate["rps"] >= base["rps"] * 0.75 and candidate["p99_ms"] <= max(base["p99_ms"] * 2, 25), {"baseline_rps": base["rps"], "candidate_rps": candidate["rps"], "baseline_p99_ms": base["p99_ms"], "candidate_p99_ms": candidate["p99_ms"]})
            for label, route, concurrency in (
                ("homepage-records-c256", "/", 256),
                ("training-loop-c256", "/learn/model-engineering/our-first-training-loop/", 256),
                ("overfitting-c256", "/learn/model-engineering/how-learning-goes-wrong/", 256),
                ("harness-c256", "/learn/model-engineering/the-harness-around-the-model/", 256),
                ("learning-c8", "/learn/", 8),
                ("track-c64", "/learn/model-engineering/", 64),
                ("chapter-c256", "/learn/model-engineering/weights-predictions-and-loss/", 256),
                ("gradients-c256", "/learn/model-engineering/gradients-and-weight-updates/", 256),
                ("roadmap-c1024", "/learn/model-engineering/roadmap/", 1024),
                ("blog-c64", "/posts/why-im-learning-how-models-learn/", 64),
            ):
                count = 1000000 if route in ("/", "/learn/model-engineering/our-first-training-loop/", "/learn/model-engineering/how-learning-goes-wrong/", "/learn/model-engineering/the-harness-around-the-model/") else 200000
                phase(label, candidate_url, route, count, concurrency)
            check("million-request feature run", sum(p["completed"] for p in result["phases"][2:]) >= 5200000, "Homepage, training-loop, overfitting and harness chapters: 1,000,000 requests each; six other learning routes: 200,000 each; concurrency 8 through 1,024.")
            try:
                get(candidate_url + "/learn/model-engineering/planned-chapter-does-not-exist/")
                check("missing chapter", False, "unexpected success")
            except urllib.error.HTTPError as error:
                check("missing chapter", error.code == 404, {"status": error.code})

            def disconnect(_):
                try:
                    with socket.create_connection(("127.0.0.1", args.port + 1), timeout=5) as connection:
                        connection.sendall(b"GET /learn/ HTTP/1.1\r\nHost: localhost\r\nX-Incomplete:")
                    return True
                except OSError:
                    return False

            with ThreadPoolExecutor(max_workers=64) as pool:
                disconnected = sum(pool.map(disconnect, range(512)))
            result["disconnect_attempts"] = {"attempted": 512, "connected_then_aborted": disconnected}
            started = time.monotonic()
            status, body = get(candidate_url + "/learn/")
            recovery_ms = (time.monotonic() - started) * 1000
            check("recovery after client disconnects", status == 200 and b"Learning" in body and recovery_ms < 1000, {"status": status, "latency_ms": round(recovery_ms, 3)})
            result["passed"] = all(item["passed"] for item in result["checks"])
            result["completed_feature_requests"] = sum(p["completed"] for p in result["phases"][2:])
            result["saturation_observation"] = "See per-phase throughput and latency at rising concurrency. Routes differ in size; this does not establish a saturation point or production overload capacity."
    except Exception as error:
        result["error"] = str(error)
        raise
    finally:
        for process in processes:
            process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for log in logs:
            log.close()
        result["finished_utc"] = datetime.now(timezone.utc).isoformat()
        save()
        print(str(output / "result.json"), flush=True)


if __name__ == "__main__":
    main()
