//! File-system commands: export file, "reveal database" and daily backup slots.
//! The database itself is read and written by the SQL plugin; Rust only decides
//! where files live and prunes old backups.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use tauri::{AppHandle, Manager};

const DB_FILE: &str = "cadence.db";
const BACKUP_DIR: &str = "backups";
/// Backups kept in total, including the one about to be written.
const KEEP: usize = 7;

#[derive(Debug, Serialize)]
pub struct FileError {
    pub kind: &'static str,
    pub message: String,
}

fn io(error: std::io::Error) -> FileError {
    FileError {
        kind: "io",
        message: error.to_string(),
    }
}

/// Only plain file names are accepted, so the web view cannot write elsewhere.
fn checked_name(name: &str, extension: &str) -> Result<(), FileError> {
    let plain = !name.is_empty()
        && !name.starts_with('.')
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        && name.ends_with(extension);
    if plain {
        Ok(())
    } else {
        Err(FileError {
            kind: "invalid_name",
            message: format!("unsupported file name: {name}"),
        })
    }
}

fn config_dir(app: &AppHandle) -> Result<PathBuf, FileError> {
    app.path().app_config_dir().map_err(|e| FileError {
        kind: "path",
        message: e.to_string(),
    })
}

/// Returns the path for today's backup, or `None` when it already exists.
/// Older backups beyond the retention count are removed first.
fn plan_backup(dir: &Path, file_name: &str) -> Result<Option<PathBuf>, FileError> {
    checked_name(file_name, ".db")?;
    fs::create_dir_all(dir).map_err(io)?;
    let target = dir.join(file_name);
    if target.exists() {
        return Ok(None);
    }
    let mut existing: Vec<String> = fs::read_dir(dir)
        .map_err(io)?
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| n.starts_with("cadence-") && n.ends_with(".db"))
        .collect();
    // Names carry the date, so sorting by name sorts by age.
    existing.sort();
    while existing.len() >= KEEP {
        let oldest = existing.remove(0);
        fs::remove_file(dir.join(oldest)).map_err(io)?;
    }
    Ok(Some(target))
}

/// Path the web view should `VACUUM INTO`, or `None` when today's backup exists.
#[tauri::command]
pub fn backup_target(app: AppHandle, file_name: String) -> Result<Option<String>, FileError> {
    let dir = config_dir(&app)?.join(BACKUP_DIR);
    Ok(plan_backup(&dir, &file_name)?.map(|p| p.to_string_lossy().into_owned()))
}

/// Writes an export into the user's Downloads folder and returns the full path.
#[tauri::command]
pub fn save_export(
    app: AppHandle,
    file_name: String,
    content: String,
) -> Result<String, FileError> {
    checked_name(&file_name, ".json")?;
    let dir = app.path().download_dir().map_err(|e| FileError {
        kind: "path",
        message: e.to_string(),
    })?;
    let path = dir.join(&file_name);
    fs::write(&path, content).map_err(io)?;
    Ok(path.to_string_lossy().into_owned())
}

/// Shows the database file in Finder / Explorer / the file manager.
#[tauri::command]
pub fn reveal_database(app: AppHandle) -> Result<(), FileError> {
    let dir = config_dir(&app)?;
    let db = dir.join(DB_FILE);
    let mut command;
    if cfg!(target_os = "macos") {
        command = Command::new("open");
        command.arg("-R").arg(if db.exists() { &db } else { &dir });
    } else if cfg!(target_os = "windows") {
        command = Command::new("explorer");
        command.arg(format!("/select,{}", db.display()));
    } else {
        command = Command::new("xdg-open");
        command.arg(&dir);
    }
    command.spawn().map_err(io)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("cadence-files-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn names_must_be_plain_files() {
        assert!(checked_name("cadence-2026-11-08.db", ".db").is_ok());
        assert!(checked_name("../evil.db", ".db").is_err());
        assert!(checked_name("a/b.db", ".db").is_err());
        assert!(checked_name(".hidden.db", ".db").is_err());
        assert!(checked_name("x.json", ".db").is_err());
        assert!(checked_name("", ".db").is_err());
    }

    #[test]
    fn keeps_the_last_seven_backups() {
        let dir = temp_dir("keep");
        fs::create_dir_all(&dir).unwrap();
        for day in 1..=9 {
            fs::write(dir.join(format!("cadence-2026-11-0{day}.db")), b"x").unwrap();
        }
        let target = plan_backup(&dir, "cadence-2026-11-10.db").unwrap();
        assert_eq!(target, Some(dir.join("cadence-2026-11-10.db")));
        let mut left: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        left.sort();
        // 6 old ones stay; the new one is written by the caller.
        assert_eq!(left.len(), 6);
        assert_eq!(left[0], "cadence-2026-11-04.db");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn skips_when_todays_backup_exists() {
        let dir = temp_dir("skip");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("cadence-2026-11-08.db"), b"x").unwrap();
        assert_eq!(plan_backup(&dir, "cadence-2026-11-08.db").unwrap(), None);
        let _ = fs::remove_dir_all(&dir);
    }
}
