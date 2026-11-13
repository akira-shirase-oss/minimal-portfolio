# Direct local Qwen from Hugging Face

Latest requirement, 13 November 2026: use Qwen locally without Ollama.

Hugging Face hosts model/tokenizer files. MLX-LM executes them on this Apple
Silicon Mac. The app calls a loopback MLX endpoint; it does not call Hugging Face
Inference Providers, OpenAI, or any other hosted generation API.

The selected candidate is the MLX community's **4-bit conversion** of Qwen3-8B,
not the original full-precision checkpoint. Four-bit storage lowers numerical
precision; it does not reduce the number of model parameters. Download size is about 4.62 GB;
runtime memory is larger and still needs measurement. This is not an identical
runtime/quantization baseline to the earlier Ollama GGUF model.

`model-config.json` pins the repository revision and MLX-LM version. These are
expected identities. The actual pinned download and package versions were
recorded on 13 November; the direct smoke and tool flow subsequently ran.
The code adapter is implemented and independently testable without weights.

## Setup from the learning workspace

For the first setup, this one command runs the ordered steps below and stops at
the first failure. It must run in a terminal with network access:

```sh
bash labs/qwen-todo-chat/start-direct-model.sh
```

It checks access to the package/model indexes, prepares the isolated Python
environment, installs the pinned runtime, downloads the pinned files and runs
one short direct generation. It does not launch either HTTP server or train
weights. The individual steps remain available to inspect:

```sh
python3 -m venv labs/qwen-todo-chat/.venv
labs/qwen-todo-chat/.venv/bin/python -m pip install -r labs/qwen-todo-chat/requirements-mlx.txt
labs/qwen-todo-chat/.venv/bin/python labs/qwen-todo-chat/setup_mlx.py download
```

`download` retrieves the pinned snapshot into the lab's ignored `.models/`
directory, hashes the files and writes a package/model manifest only after the
download completes. It uses the public repository without a Hugging Face token.
Downloading files is neither inference nor training.

First run one short generation directly through the Python library:

```sh
labs/qwen-todo-chat/.venv/bin/python labs/qwen-todo-chat/setup_mlx.py smoke
```

That helper uses `mlx_lm.load` and `generate` on the downloaded directory,
requests at most 16 output tokens and saves the actual text. It does not use an
HTTP server. A completed smoke run would still not establish tool-use quality.

Then, in one terminal, start local inference for the app:

```sh
labs/qwen-todo-chat/.venv/bin/python labs/qwen-todo-chat/setup_mlx.py serve
```

In another, start the chat/harness:

```sh
node labs/qwen-todo-chat/server.mjs
```

Open the chat server's printed URL, normally `http://127.0.0.1:3210`. The MLX
server is `http://127.0.0.1:8080`; `default_model` selects the pinned local model
loaded by our launcher. This OpenAI-compatible protocol does not imply an
OpenAI account, key or cloud call. There is no Ollama fallback.

## The runtime boundary

MLX returns OpenAI-style `choices`, stringified function arguments, tool-call
IDs, and usage. `model.mjs` normalizes those into our harness's message/data
shape. Each tool result keeps the matching call ID; arguments are checked
before the SQLite action. Malformed call JSON fails instead of being silently
repaired or executed as text. See `test/model.test.mjs` for scripted wire checks.

We request non-thinking output through `chat_template_kwargs`, with temperature
0, seed 42 and max_tokens 256. The prior Ollama `num_ctx=4096` setting is not
passed to MLX: the history character limit remains, but no equivalent backend
token-context cap has been configured. Measure memory/context behavior before
calling this a comparable benchmark or an optimized deployment.

## Actual setup state

On 13 November, network/loopback access was restored. The isolated Python 3.14.6
environment installed MLX-LM 0.32.2, MLX 0.32.4, huggingface-hub 2.4.0 and
transformers 5.23.0. The pinned snapshot contains 11 files totaling 4,623,784,971
bytes. The direct smoke answered `READY.` in 4.629 seconds including model load;
this is one observed run, not a speed benchmark. The local model endpoint and
Node dashboard now serve on ports 8080 and 3210. Four real development queries
exercised creation, listing, missing-title clarification and unsupported-delete
refusal. No weights were trained and no savings were measured.

Earlier attempts failed name resolution and loopback binding under the previous
execution permissions. Changing ports did not fix that denial. Those failed
attempts remain in the dated checkpoint and public experiment history. The new
successful setup supersedes their status, without erasing their evidence.

`.models/model-manifest.json` records actual downloaded-file hashes. The model
screen's `/health` check verifies endpoint health separately; it is not an
identity attestation. The `/v1/models` endpoint returned 200 with an empty body in
this installation. Inspect actual completion traces before assuming tool quality.

Sources checked: [MLX-LM](https://github.com/ml-explore/mlx-lm),
[pinned MLX-LM server implementation](https://github.com/ml-explore/mlx-lm/blob/93e6d4a6447b3080861985947f0820e76fcb957d/mlx_lm/server.py),
[model files](https://huggingface.co/mlx-community/Qwen3-8B-4bit/tree/545dc4251c05440727734bcd94334791f6ab0192),
[MLX-LM release](https://pypi.org/project/mlx-lm/0.32.2/).
