mod ai;
mod files;
mod secrets;

use std::str::FromStr;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Event the web view listens for to open the capture box.
pub const QUICK_CAPTURE_EVENT: &str = "quick-capture";

/// Brings the main window to the front and tells the UI to focus quick capture.
fn open_quick_capture(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
    let _ = app.emit(QUICK_CAPTURE_EVENT, ());
}

/// The shortcut currently registered for quick capture.
struct CaptureShortcut(Mutex<Shortcut>);

/// Serializable error for the web view.
#[derive(Debug, Serialize)]
pub struct ShortcutError {
    pub kind: &'static str,
    pub message: String,
}

fn parse_accelerator(accelerator: &str) -> Result<Shortcut, ShortcutError> {
    Shortcut::from_str(accelerator.trim()).map_err(|e| ShortcutError {
        kind: "invalid",
        message: e.to_string(),
    })
}

/// Replaces the global quick-capture shortcut. The old one is kept if the new
/// one cannot be registered (for example because another app owns it).
#[tauri::command]
fn set_capture_shortcut(
    app: AppHandle,
    state: State<CaptureShortcut>,
    accelerator: String,
) -> Result<(), ShortcutError> {
    let next = parse_accelerator(&accelerator)?;
    let mut current = state.0.lock().map_err(|_| ShortcutError {
        kind: "internal",
        message: "shortcut state is unavailable".into(),
    })?;
    if *current == next {
        return Ok(());
    }
    let shortcuts = app.global_shortcut();
    shortcuts.register(next).map_err(|e| ShortcutError {
        kind: "register",
        message: e.to_string(),
    })?;
    // Failing to drop the old binding must not undo the new one.
    if let Err(error) = shortcuts.unregister(*current) {
        eprintln!("could not unregister previous quick capture shortcut: {error}");
    }
    *current = next;
    Ok(())
}

/// Starts the desktop shell. Rust stays a thin layer (see CLAUDE.md).
pub fn run() {
    let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    let global_shortcut = tauri_plugin_global_shortcut::Builder::new()
        // The plugin only calls this for shortcuts that are registered.
        .with_handler(move |app, _pressed, event| {
            if event.state() == ShortcutState::Pressed {
                open_quick_capture(app);
            }
        })
        .build();

    if let Err(error) = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(global_shortcut)
        .plugin(tauri_plugin_notification::init())
        .manage(ai::AiJobs::default())
        .manage(CaptureShortcut(Mutex::new(shortcut)))
        .invoke_handler(tauri::generate_handler![
            ai::ai_complete,
            ai::ai_cancel,
            ai::ai_test,
            secrets::secret_set,
            secrets::secret_has,
            secrets::secret_clear,
            files::backup_target,
            files::save_export,
            files::reveal_database,
            set_capture_shortcut
        ])
        .setup(move |app| {
            // Another app may own the shortcut; the app must still start.
            if let Err(error) = app.global_shortcut().register(shortcut) {
                eprintln!("could not register quick capture shortcut: {error}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
    {
        eprintln!("error while running Cadence: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crate_builds() {
        assert_eq!(env!("CARGO_PKG_NAME"), "cadence");
    }

    #[test]
    fn accelerators_are_parsed() {
        assert!(parse_accelerator("Alt+Space").is_ok());
        assert!(parse_accelerator(" CmdOrCtrl+Shift+K ").is_ok());
    }

    #[test]
    fn bad_accelerators_return_a_typed_error() {
        let error = parse_accelerator("Banana+Nope").unwrap_err();
        assert_eq!(error.kind, "invalid");
        assert!(parse_accelerator("").is_err());
    }

    #[test]
    fn event_name_matches_the_web_view_contract() {
        assert_eq!(QUICK_CAPTURE_EVENT, "quick-capture");
    }
}
