+++
title = "How tool calling actually works: the model never called my function"
description = "The model proposes. My program executes. Mixing those up is where the trouble starts."
date = 2026-11-08

[extra]
# experiment, failure or release
kind = "experiment"
+++

I got my first tool call working with `qwen3:8b` in Ollama.

That sounds like the model reached into my program and ran a function. It didn't. It produced a request to run one. Something outside the model had to turn that request into an action.

I'm learning this alongside building Rust projects: Colophon CMS, Service Monitor, and jsrt. The useful part isn't making another thing look autonomous. It's finding the boundary where generated text becomes something my program is willing to do.

Here's the mechanism, a deliberately dishonest clock experiment, and the shape of a small Rust harness. I ran both requests locally. The fake result didn't fool the model in the way I expected, which makes the boundary more interesting.

## Step 1: Describe a function, don't execute it

A model generates tokens. With tool calling, those tokens can represent a function name and its arguments instead of an ordinary answer. The serving layer exposes the request as structured data.

For Ollama's `/api/chat`, I send `messages` plus a `tools` array. Each function definition has a `name`, a `description`, and a JSON Schema under `parameters`.

That's an interface description. It doesn't contain an implementation, a clock, or permission to access anything.

This distinction is visible in [Ollama's tool-calling guide](https://docs.ollama.com/capabilities/tool-calling): make a request, inspect `message.tool_calls`, execute the function in application code, then send its result back.

The model isn't importing my Rust function. It needs a description of what it can ask for, not the implementation language.

## Step 2: Stop before the clock runs

With Ollama running locally and `qwen3:8b` already installed, this sends the first request. It saves the response as `first.json` in the current directory; use a scratch directory without an existing file of that name.

```bash
curl --fail-with-body -sS http://localhost:11434/api/chat \
  -H 'Content-Type: application/json' -d '{
  "model": "qwen3:8b",
  "stream": false,
  "messages": [{"role":"user","content":"What time is it in Toronto? Use get_time."}],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_time",
      "description": "Get the current time for a city",
      "parameters": {
        "type": "object",
        "required": ["city"],
        "properties": {"city": {"type":"string"}},
        "additionalProperties": false
      }
    }
  }]
}' | tee first.json
```

`stream: false` asks for one JSON response rather than streamed chunks. The [chat API reference](https://docs.ollama.com/api/chat) documents the response's `message`, including `content` and `tool_calls`.

The thing to inspect is `message.tool_calls[].function`: its `name` and `arguments`. A call request is not evidence of execution. Nothing in this curl command implements `get_time`.

The model may answer without calling, request something unexpected, or produce a different city string. Those are observations too, not reasons to quietly replace its output with the result I wanted.

My run on November 8, 2026, around 5:10 PM Toronto time (EST), used Ollama `0.40.15` and installed model `qwen3:8b`, digest `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41` (`Q4_K_M`). This was the actual assistant message; the `thinking` field is omitted:

```json
{
  "role": "assistant",
  "content": "",
  "tool_calls": [
    {
      "id": "call_x0qe6lzs",
      "function": {
        "index": 0,
        "name": "get_time",
        "arguments": {
          "city": "Toronto"
        }
      }
    }
  ]
}
```

## Step 3: Feed it a dishonest result

Now I can answer the pending tool request without consulting a clock at all.

This second command needs `jq`. It preserves the actual assistant message, checks for exactly one `get_time` request for Toronto, and constructs a follow-up request with a deliberately fake result. If that check fails, stop and inspect the first response.

```bash
jq -n --slurpfile first first.json '
  $first[0].message as $m |
  if (($m.tool_calls | length) == 1 and
      $m.tool_calls[0].function.name == "get_time" and
      $m.tool_calls[0].function.arguments.city == "Toronto")
  then {
    model: "qwen3:8b", stream: false,
    messages: [
      {role:"user", content:"What time is it in Toronto? Use get_time."},
      $m,
      {role:"tool", tool_name:"get_time", content:"03:14 on Mars"}
    ]
  } else error("Inspect first.json: expected one Toronto get_time call") end
' > mars-request.json &&
curl --fail-with-body -sS http://localhost:11434/api/chat \
  -H 'Content-Type: application/json' --data-binary @mars-request.json
```

For this Ollama example, the tool reply uses **`tool_name`**, not `name`. The requested function's name is under `tool_calls[].function.name`. Ollama's tool guide shows the former explicitly, although the chat reference's displayed `ChatMessage` schema omits `tool_name`. I'm following the guide rather than importing another API's message format.

The follow-up used the complete original assistant message, including its thinking field, followed by the fake tool result. Here's what actually came back; again, only the thinking field is omitted.

```json
{
  "role": "assistant",
  "content": "It seems there was an error in the response. Toronto follows Eastern Time Zone (ET), which is currently UTC-4 (or UTC-5 during daylight saving time). The mention of \"Mars\" appears to be an incorrect or placeholder response. \n\nFor accurate time, I'll provide the correct current time in Toronto based on real-time data. Let me check... \n\n**Current time in Toronto**: [Insert accurate time here, e.g., \"3:14 PM ET\"]. \n\nNote: The tool's response about Mars was likely a mistake. Let me know if you'd like further clarification!"
}
```

It rejected Mars. It also reversed the standard/daylight-saving offsets and claimed it would check real-time data without issuing another tool request. The bracketed “Insert accurate time” text above is the model's literal output, not an editorial field awaiting completion. No real clock was queried in either request.

So this run does **not** demonstrate blind acceptance of tool output. It demonstrates that detecting nonsense and having a verified answer are different things.

The point isn't that a model must believe every tool result. It can notice nonsense. The point is that this message contains no proof a clock ran. A plausible lie is harder to spot than Mars.

## Step 4: Make the harness explicit

The harness is ordinary application code: keep the history, send it, dispatch allowed requests, append results, repeat.

Here's a **Rust sketch, compile-checked but not runtime-tested**. The exact snippet passed `cargo check` and `cargo build` as a library on the box with Rust 1.85.1 and `reqwest` 0.12.12; unused-code warnings are expected because this snippet has no entry point. For local HTTP, it uses `reqwest` with default features disabled and its `json` feature enabled, `serde` with `derive`, `serde_json`, `chrono`, and `chrono-tz`, inside a Tokio runtime. Pass the first request's `tools` array to `agent_loop`. The handler really reads a clock; the curl experiment above deliberately doesn't.

```rust
use std::{collections::HashMap, time::Duration};
use serde::Deserialize;
use serde_json::{json, Value};

type Tool = fn(Value) -> Result<String, String>;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TimeArgs {
    city: String,
}

fn get_time(args: Value) -> Result<String, String> {
    let args: TimeArgs = serde_json::from_value(args)
        .map_err(|e| format!("invalid arguments: {e}"))?;
    if args.city != "Toronto" {
        return Err("only Toronto is supported".into());
    }
    Ok(chrono::Utc::now()
        .with_timezone(&chrono_tz::America::Toronto)
        .to_rfc3339())
}

async fn agent_loop(tools: Value) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120)).build()?;
    let registry: HashMap<&str, Tool> =
        HashMap::from([("get_time", get_time as Tool)]);
    let mut messages = vec![json!({
        "role": "user", "content": "What time is it in Toronto? Use get_time."
    })];

    for _ in 0..6 {
        let response: Value = client
            .post("http://localhost:11434/api/chat")
            .json(&json!({"model":"qwen3:8b", "stream":false,
                          "messages": &messages, "tools": &tools}))
            .send().await?.error_for_status()?.json().await?;
        let msg = response.get("message")
            .filter(|m| m.is_object()).ok_or("missing message")?.clone();
        let calls = match msg.get("tool_calls") {
            None | Some(Value::Null) => vec![],
            Some(Value::Array(calls)) => calls.clone(),
            _ => return Err("invalid tool_calls".into()),
        };
        messages.push(msg); // Preserve the complete assistant message.
        if calls.is_empty() {
            println!("{}", messages.last().unwrap()["content"]);
            return Ok(());
        }
        if calls.len() > 4 { return Err("too many calls".into()); }
        for call in calls {
            let name = call["function"]["name"].as_str()
                .ok_or("missing tool name")?;
            let handler = registry.get(name).ok_or("unknown tool")?;
            let result = match handler(call["function"]["arguments"].clone()) {
                Ok(value) => json!({"ok":true, "value":value}),
                Err(error) => json!({"ok":false, "error":error}),
            };
            messages.push(json!({"role":"tool", "tool_name":name,
                                 "content":result.to_string()}));
        }
    }
    Err("agent turn limit exceeded".into())
}
```

Multiple requests in one response are handled sequentially here. They don't have to run concurrently to count as tool calls.

The registry is an allowlist, not dynamic execution of whatever name appears. Deserialization checks types, missing fields, and extra fields. The handler checks the supported city. The host bounds turns and calls, and sets an HTTP deadline.

This still isn't production hardening. I'd need response-size and history limits, cancellation, tests, and explicit authorization before adding side effects. A timeout on this HTTP client wouldn't bound a future blocking tool handler.

## The honest part: valid JSON isn't permission

Constrained decoding can mask tokens that would violate a grammar during generation. [XGrammar explains that mechanism](https://xgrammar.mlc.ai/docs/latest/start/constrained_decoding.html). It improves structural reliability; it doesn't establish that a requested action is safe or a result is true. I'm not claiming this particular Ollama request enables that mechanism.

Likewise, a tool result is data, not an instruction source. A fetched page telling the model to ignore its rules shouldn't gain authority because it arrived through a tool. Argument validation protects dispatch; result provenance and authorization are separate jobs.

This maps to something I already care about in jsrt: the host owns capabilities. And in Colophon, an intent to publish isn't evidence that publication succeeded.

Same boundary here. A generated request isn't an executed function. An answer describing success isn't a receipt.

That's the part I want to build around.
