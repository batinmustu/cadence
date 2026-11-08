//! Outbound AI requests. Keys are read from the keychain here and never leave Rust (ADR 0004).
//! Prompts are not logged.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::oneshot;

use crate::secrets::{check_provider, KeychainStore, SecretStore};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
/// Max silence between two chunks before the request is given up.
const IDLE_TIMEOUT: Duration = Duration::from_secs(60);
const ANTHROPIC_VERSION: &str = "2023-06-01";

#[derive(Debug, Serialize, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum AiErrorKind {
    Auth,
    RateLimit,
    Network,
    Timeout,
    Provider,
    Cancelled,
    Config,
}

/// Error sent to the web view. Never contains keys or prompts.
#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct AiError {
    pub kind: AiErrorKind,
    pub message: String,
}

impl AiError {
    fn new(kind: AiErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiRequest {
    pub provider: String,
    pub model: String,
    pub system: String,
    pub prompt: String,
    /// Overrides the provider's default endpoint (proxies, self-hosted gateways, remote Ollama).
    pub base_url: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Wire {
    Anthropic,
    OpenAiCompatible,
    Ollama,
}

fn wire(provider: &str) -> Result<Wire, AiError> {
    match provider {
        "anthropic" => Ok(Wire::Anthropic),
        "openai" | "openrouter" => Ok(Wire::OpenAiCompatible),
        "ollama" => Ok(Wire::Ollama),
        _ => Err(AiError::new(AiErrorKind::Config, "unknown provider")),
    }
}

fn default_base(provider: &str) -> &'static str {
    match provider {
        "anthropic" => "https://api.anthropic.com",
        "openrouter" => "https://openrouter.ai/api/v1",
        "ollama" => "http://localhost:11434",
        _ => "https://api.openai.com/v1",
    }
}

fn base(provider: &str, custom: &Option<String>) -> String {
    custom
        .as_deref()
        .map(str::trim)
        .filter(|b| !b.is_empty())
        .unwrap_or_else(|| default_base(provider))
        .trim_end_matches('/')
        .to_string()
}

struct Prepared {
    url: String,
    headers: Vec<(&'static str, String)>,
    body: Value,
}

fn prepare(req: &AiRequest, key: Option<&str>) -> Result<Prepared, AiError> {
    let kind = wire(&req.provider)?;
    let base = base(&req.provider, &req.base_url);
    let need_key = || key.ok_or_else(|| AiError::new(AiErrorKind::Auth, "no API key saved"));
    Ok(match kind {
        Wire::Anthropic => Prepared {
            url: format!("{base}/v1/messages"),
            headers: vec![
                ("x-api-key", need_key()?.to_string()),
                ("anthropic-version", ANTHROPIC_VERSION.to_string()),
            ],
            body: json!({
                "model": req.model,
                "max_tokens": 4096,
                "stream": true,
                "system": req.system,
                "messages": [{"role": "user", "content": req.prompt}],
            }),
        },
        Wire::OpenAiCompatible => Prepared {
            url: format!("{base}/chat/completions"),
            headers: vec![("authorization", format!("Bearer {}", need_key()?))],
            body: json!({
                "model": req.model,
                "stream": true,
                "messages": [
                    {"role": "system", "content": req.system},
                    {"role": "user", "content": req.prompt},
                ],
            }),
        },
        Wire::Ollama => Prepared {
            url: format!("{base}/api/chat"),
            headers: vec![],
            body: json!({
                "model": req.model,
                "stream": true,
                "messages": [
                    {"role": "system", "content": req.system},
                    {"role": "user", "content": req.prompt},
                ],
            }),
        },
    })
}

/// Text carried by one streamed line, if any. Unknown or empty lines yield `None`.
fn parse_line(kind: Wire, line: &str) -> Result<Option<String>, AiError> {
    let line = line.trim();
    let payload = match kind {
        Wire::Ollama => line,
        _ => match line.strip_prefix("data:") {
            Some(rest) => rest.trim(),
            None => return Ok(None),
        },
    };
    if payload.is_empty() || payload == "[DONE]" {
        return Ok(None);
    }
    let Ok(value) = serde_json::from_str::<Value>(payload) else {
        return Ok(None);
    };
    if let Some(message) = value
        .pointer("/error/message")
        .or_else(|| value.get("error"))
        .and_then(Value::as_str)
    {
        return Err(AiError::new(AiErrorKind::Provider, message));
    }
    let text = match kind {
        Wire::Anthropic if value["type"] == "content_block_delta" => {
            value.pointer("/delta/text").and_then(Value::as_str)
        }
        Wire::Anthropic => None,
        Wire::OpenAiCompatible => value
            .pointer("/choices/0/delta/content")
            .and_then(Value::as_str),
        Wire::Ollama => value.pointer("/message/content").and_then(Value::as_str),
    };
    Ok(text.filter(|t| !t.is_empty()).map(str::to_string))
}

fn status_error(status: reqwest::StatusCode, body: &str) -> AiError {
    let kind = match status.as_u16() {
        401 | 403 => AiErrorKind::Auth,
        429 => AiErrorKind::RateLimit,
        _ => AiErrorKind::Provider,
    };
    let detail: String = serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|v| {
            v.pointer("/error/message")
                .or_else(|| v.get("error"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_default()
        .chars()
        .take(300)
        .collect();
    AiError::new(kind, format!("HTTP {}: {}", status.as_u16(), detail))
}

fn network_error(error: &reqwest::Error) -> AiError {
    if error.is_timeout() {
        AiError::new(AiErrorKind::Timeout, "the request timed out")
    } else {
        // reqwest errors can embed the URL; keep only a generic message.
        AiError::new(AiErrorKind::Network, "could not reach the provider")
    }
}

fn client() -> Result<reqwest::Client, AiError> {
    reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .build()
        .map_err(|_| AiError::new(AiErrorKind::Config, "could not create HTTP client"))
}

/// Streams a completion, calling `on_chunk` for every piece of text. Dropping `cancel`'s sender
/// does not cancel; sending on it does.
pub async fn stream_completion(
    req: &AiRequest,
    key: Option<&str>,
    mut on_chunk: impl FnMut(String),
    mut cancel: oneshot::Receiver<()>,
) -> Result<(), AiError> {
    let kind = wire(&req.provider)?;
    let prepared = prepare(req, key)?;
    let mut builder = client()?.post(&prepared.url).json(&prepared.body);
    for (name, value) in &prepared.headers {
        builder = builder.header(*name, value);
    }
    let cancelled = || AiError::new(AiErrorKind::Cancelled, "cancelled");
    let response = tokio::select! {
        _ = &mut cancel => return Err(cancelled()),
        r = tokio::time::timeout(IDLE_TIMEOUT, builder.send()) => match r {
            Err(_) => return Err(AiError::new(AiErrorKind::Timeout, "the request timed out")),
            Ok(Err(e)) => return Err(network_error(&e)),
            Ok(Ok(resp)) => resp,
        },
    };
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(status_error(status, &body));
    }
    let mut stream = response.bytes_stream();
    let mut buffer: Vec<u8> = Vec::new();
    loop {
        let next = tokio::select! {
            _ = &mut cancel => return Err(cancelled()),
            n = tokio::time::timeout(IDLE_TIMEOUT, stream.next()) => n,
        };
        match next {
            Err(_) => {
                return Err(AiError::new(
                    AiErrorKind::Timeout,
                    "the provider stopped responding",
                ))
            }
            Ok(None) => break,
            Ok(Some(Err(e))) => return Err(network_error(&e)),
            Ok(Some(Ok(bytes))) => {
                buffer.extend_from_slice(&bytes);
                // Split on bytes so multi-byte characters cut by a chunk boundary stay intact.
                while let Some(pos) = buffer.iter().position(|b| *b == b'\n') {
                    let line: Vec<u8> = buffer.drain(..=pos).collect();
                    if let Some(text) = parse_line(kind, &String::from_utf8_lossy(&line))? {
                        on_chunk(text);
                    }
                }
            }
        }
    }
    if !buffer.is_empty() {
        if let Some(text) = parse_line(kind, &String::from_utf8_lossy(&buffer))? {
            on_chunk(text);
        }
    }
    Ok(())
}

/// Checks that the provider answers and accepts the key, using its cheap model-list endpoint.
pub async fn test_connection(
    provider: &str,
    base_url: &Option<String>,
    key: Option<&str>,
) -> Result<(), AiError> {
    let kind = wire(provider)?;
    let base = base(provider, base_url);
    let client = client()?;
    let request = match kind {
        Wire::Anthropic => client
            .get(format!("{base}/v1/models"))
            .header("x-api-key", key.unwrap_or_default())
            .header("anthropic-version", ANTHROPIC_VERSION),
        Wire::OpenAiCompatible => client.get(format!("{base}/models")).header(
            "authorization",
            format!("Bearer {}", key.unwrap_or_default()),
        ),
        Wire::Ollama => client.get(format!("{base}/api/tags")),
    };
    if kind != Wire::Ollama && key.is_none() {
        return Err(AiError::new(AiErrorKind::Auth, "no API key saved"));
    }
    let response = tokio::time::timeout(IDLE_TIMEOUT, request.send())
        .await
        .map_err(|_| AiError::new(AiErrorKind::Timeout, "the request timed out"))?
        .map_err(|e| network_error(&e))?;
    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        Err(status_error(
            status,
            &response.text().await.unwrap_or_default(),
        ))
    }
}

/// Running requests, so the UI can cancel them by id.
#[derive(Default)]
pub struct AiJobs(Mutex<HashMap<String, oneshot::Sender<()>>>);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ChunkEvent {
    request_id: String,
    chunk: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DoneEvent {
    request_id: String,
}

fn key_for(provider: &str) -> Result<Option<String>, AiError> {
    check_provider(provider).map_err(|e| AiError::new(AiErrorKind::Config, e.message))?;
    KeychainStore
        .get(provider)
        .map_err(|e| AiError::new(AiErrorKind::Config, e.message))
}

#[tauri::command]
pub async fn ai_complete(
    app: AppHandle,
    jobs: State<'_, AiJobs>,
    request_id: String,
    request: AiRequest,
) -> Result<(), AiError> {
    let key = key_for(&request.provider)?;
    let (tx, rx) = oneshot::channel();
    if let Ok(mut map) = jobs.0.lock() {
        map.insert(request_id.clone(), tx);
    }
    let id = request_id.clone();
    let emitter = app.clone();
    let result = stream_completion(
        &request,
        key.as_deref(),
        move |chunk| {
            let _ = emitter.emit(
                "ai-chunk",
                ChunkEvent {
                    request_id: id.clone(),
                    chunk,
                },
            );
        },
        rx,
    )
    .await;
    if let Ok(mut map) = jobs.0.lock() {
        map.remove(&request_id);
    }
    if result.is_ok() {
        let _ = app.emit("ai-done", DoneEvent { request_id });
    }
    result
}

#[tauri::command]
pub fn ai_cancel(jobs: State<'_, AiJobs>, request_id: String) {
    if let Ok(mut map) = jobs.0.lock() {
        if let Some(tx) = map.remove(&request_id) {
            let _ = tx.send(());
        }
    }
}

#[tauri::command]
pub async fn ai_test(provider: String, base_url: Option<String>) -> Result<(), AiError> {
    let key = key_for(&provider)?;
    test_connection(&provider, &base_url, key.as_deref()).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    /// One-shot local HTTP server returning a canned response. No real network is used.
    async fn mock_server(status: &str, body: &'static str) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let status = status.to_string();
        tokio::spawn(async move {
            if let Ok((mut socket, _)) = listener.accept().await {
                let mut buf = vec![0u8; 8192];
                let _ = socket.read(&mut buf).await;
                let response = format!(
                    "HTTP/1.1 {status}\r\ncontent-type: text/event-stream\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = socket.write_all(response.as_bytes()).await;
            }
        });
        format!("http://{addr}")
    }

    fn request(provider: &str, base_url: String) -> AiRequest {
        AiRequest {
            provider: provider.into(),
            model: "m".into(),
            system: "s".into(),
            prompt: "p".into(),
            base_url: Some(base_url),
        }
    }

    async fn collect(req: &AiRequest, key: Option<&str>) -> (Vec<String>, Result<(), AiError>) {
        let mut chunks = Vec::new();
        let (_tx, rx) = oneshot::channel();
        let result = stream_completion(req, key, |c| chunks.push(c), rx).await;
        (chunks, result)
    }

    #[test]
    fn parses_each_wire_format() {
        let a = r#"data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}"#;
        assert_eq!(parse_line(Wire::Anthropic, a), Ok(Some("Hi".into())));
        assert_eq!(parse_line(Wire::Anthropic, "event: ping"), Ok(None));
        let o = r#"data: {"choices":[{"delta":{"content":"Yo"}}]}"#;
        assert_eq!(parse_line(Wire::OpenAiCompatible, o), Ok(Some("Yo".into())));
        assert_eq!(parse_line(Wire::OpenAiCompatible, "data: [DONE]"), Ok(None));
        let l = r#"{"message":{"content":"Hey"},"done":false}"#;
        assert_eq!(parse_line(Wire::Ollama, l), Ok(Some("Hey".into())));
    }

    #[test]
    fn stream_errors_become_provider_errors() {
        let e = parse_line(
            Wire::Anthropic,
            r#"data: {"type":"error","error":{"message":"overloaded"}}"#,
        )
        .unwrap_err();
        assert_eq!(e.kind, AiErrorKind::Provider);
    }

    #[test]
    fn builds_provider_specific_requests() {
        let mut r = request("anthropic", "https://x.test/".into());
        let p = prepare(&r, Some("k")).unwrap();
        assert_eq!(p.url, "https://x.test/v1/messages");
        assert!(p.headers.iter().any(|(n, v)| *n == "x-api-key" && v == "k"));
        r.provider = "openrouter".into();
        assert_eq!(
            prepare(&r, Some("k")).unwrap().url,
            "https://x.test/chat/completions"
        );
        r.provider = "ollama".into();
        assert!(prepare(&r, None).unwrap().headers.is_empty());
        r.provider = "openai".into();
        assert_eq!(
            prepare(&r, None).err().map(|e| e.kind),
            Some(AiErrorKind::Auth)
        );
        r.base_url = None;
        r.provider = "ollama".into();
        assert_eq!(
            prepare(&r, None).unwrap().url,
            "http://localhost:11434/api/chat"
        );
    }

    #[test]
    fn rejects_unknown_provider() {
        let r = request("nope", "http://x".into());
        assert_eq!(
            prepare(&r, Some("k")).err().map(|e| e.kind),
            Some(AiErrorKind::Config)
        );
    }

    #[tokio::test]
    async fn streams_anthropic_chunks() {
        let body = "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"Hel\"}}\n\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"lo ü\"}}\n\n";
        let url = mock_server("200 OK", body).await;
        let (chunks, result) = collect(&request("anthropic", url), Some("k")).await;
        assert_eq!(result, Ok(()));
        assert_eq!(chunks, vec!["Hel", "lo ü"]);
    }

    #[tokio::test]
    async fn streams_ollama_without_a_key() {
        let body =
            "{\"message\":{\"content\":\"A\"}}\n{\"message\":{\"content\":\"B\"},\"done\":true}\n";
        let url = mock_server("200 OK", body).await;
        let (chunks, result) = collect(&request("ollama", url), None).await;
        assert_eq!(result, Ok(()));
        assert_eq!(chunks.concat(), "AB");
    }

    #[tokio::test]
    async fn maps_http_statuses_to_error_kinds() {
        for (status, kind) in [
            ("401 Unauthorized", AiErrorKind::Auth),
            ("429 Too Many Requests", AiErrorKind::RateLimit),
            ("500 Internal Server Error", AiErrorKind::Provider),
        ] {
            let url = mock_server(status, "{\"error\":{\"message\":\"nope\"}}").await;
            let (_, result) = collect(&request("openai", url), Some("sk-secret")).await;
            let err = result.unwrap_err();
            assert_eq!(err.kind, kind);
            assert!(!err.message.contains("sk-secret"));
        }
    }

    #[tokio::test]
    async fn unreachable_server_is_a_network_error() {
        let (_, result) = collect(&request("ollama", "http://127.0.0.1:1".into()), None).await;
        assert_eq!(result.unwrap_err().kind, AiErrorKind::Network);
    }

    #[tokio::test]
    async fn cancellation_stops_the_request() {
        // A server that accepts but never answers.
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            let _held = listener.accept().await;
            tokio::time::sleep(Duration::from_secs(30)).await;
        });
        let (tx, rx) = oneshot::channel();
        let req = request("ollama", url);
        let task = tokio::spawn(async move { stream_completion(&req, None, |_| {}, rx).await });
        tokio::time::sleep(Duration::from_millis(100)).await;
        tx.send(()).unwrap();
        assert_eq!(
            task.await.unwrap().unwrap_err().kind,
            AiErrorKind::Cancelled
        );
    }

    #[tokio::test]
    async fn connection_test_reports_auth_failures() {
        let url = mock_server("401 Unauthorized", "{}").await;
        let err = test_connection("openai", &Some(url), Some("k"))
            .await
            .unwrap_err();
        assert_eq!(err.kind, AiErrorKind::Auth);
        let url = mock_server("200 OK", "{}").await;
        assert_eq!(test_connection("ollama", &Some(url), None).await, Ok(()));
    }
}
