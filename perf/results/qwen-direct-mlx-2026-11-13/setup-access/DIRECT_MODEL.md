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
expected identities; the local model has not yet been downloaded or loaded.
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

A local `.venv` was created on Python 3.14.6. The dependency install attempt
could not resolve `mlx-lm==0.32.2` from the available package index. The exact
cause was not established by that message. Official PyPI lists the release;
do not infer that the package does not exist or that this Python version is
incompatible. A later diagnostic confirmed that this execution session cannot
resolve PyPI or Hugging Face, and no matching package/model cache was found.
Requesting a network-enabled install was rejected by the workspace's permission
policy because sandbox escalation is disabled. There is no narrower network
permission tool exposed here. No model download, Metal execution, inference or
training ran. Previous loopback-bind restrictions also remain unresolved.

The first real milestone is a short successful generation, then a tool request
that creates exactly one requested todo. Capture actual package versions,
snapshot identity, raw response and token/memory/time measurements. Retest old
task cases; neither conversion nor a runtime change is a fine-tuning result.

Sources checked: [MLX-LM](https://github.com/ml-explore/mlx-lm),
[pinned MLX-LM server implementation](https://github.com/ml-explore/mlx-lm/blob/93e6d4a6447b3080861985947f0820e76fcb957d/mlx_lm/server.py),
[model files](https://huggingface.co/mlx-community/Qwen3-8B-4bit/tree/545dc4251c05440727734bcd94334791f6ab0192),
[MLX-LM release](https://pypi.org/project/mlx-lm/0.32.2/).
