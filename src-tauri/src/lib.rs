mod secrets;

use tauri::{AppHandle, Emitter, Manager};
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

/// Starts the desktop shell. Rust stays a thin layer (see CLAUDE.md).
pub fn run() {
    let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    let global_shortcut = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, pressed, event| {
            if event.state() == ShortcutState::Pressed && pressed == &shortcut {
                open_quick_capture(app);
            }
        })
        .build();

    if let Err(error) = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(global_shortcut)
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            secrets::secret_set,
            secrets::secret_has,
            secrets::secret_clear
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
    fn event_name_matches_the_web_view_contract() {
        assert_eq!(QUICK_CAPTURE_EVENT, "quick-capture");
    }
}
