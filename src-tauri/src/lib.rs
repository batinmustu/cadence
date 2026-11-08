/// Starts the desktop shell. Rust stays a thin layer (see CLAUDE.md).
pub fn run() {
    if let Err(error) = tauri::Builder::default().run(tauri::generate_context!()) {
        eprintln!("error while running Cadence: {error}");
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn crate_builds() {
        assert_eq!(env!("CARGO_PKG_NAME"), "cadence");
    }
}
