//! AI provider keys live in the OS keychain and are only ever used in Rust (ADR 0004).
//! There is deliberately no command that returns a key.

use serde::Serialize;

const SERVICE: &str = "app.cadence.ai";
const PROVIDERS: [&str; 4] = ["anthropic", "openai", "openrouter", "ollama"];

/// Error that crosses the IPC boundary. It never contains key material.
#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct SecretError {
    pub message: String,
}

impl SecretError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

/// Storage behind the commands, so tests can use memory instead of the keychain.
pub trait SecretStore {
    fn set(&self, provider: &str, key: &str) -> Result<(), SecretError>;
    fn has(&self, provider: &str) -> Result<bool, SecretError>;
    fn clear(&self, provider: &str) -> Result<(), SecretError>;
    /// Used by the AI request layer (#27); never exposed as a command.
    fn get(&self, provider: &str) -> Result<Option<String>, SecretError>;
}

/// Only known providers may be used as keychain account names.
pub fn check_provider(provider: &str) -> Result<(), SecretError> {
    if PROVIDERS.contains(&provider) {
        Ok(())
    } else {
        Err(SecretError::new("unknown provider"))
    }
}

pub struct KeychainStore;

fn entry(provider: &str) -> Result<keyring::Entry, SecretError> {
    keyring::Entry::new(SERVICE, provider).map_err(|_| SecretError::new("keychain unavailable"))
}

impl SecretStore for KeychainStore {
    fn set(&self, provider: &str, key: &str) -> Result<(), SecretError> {
        entry(provider)?
            .set_password(key)
            .map_err(|_| SecretError::new("could not save the key"))
    }

    fn has(&self, provider: &str) -> Result<bool, SecretError> {
        Ok(self.get(provider)?.is_some())
    }

    fn clear(&self, provider: &str) -> Result<(), SecretError> {
        match entry(provider)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(SecretError::new("could not remove the key")),
        }
    }

    fn get(&self, provider: &str) -> Result<Option<String>, SecretError> {
        match entry(provider)?.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(SecretError::new("could not read the keychain")),
        }
    }
}

pub fn set_secret(store: &dyn SecretStore, provider: &str, key: &str) -> Result<(), SecretError> {
    check_provider(provider)?;
    if key.trim().is_empty() {
        return Err(SecretError::new("key is empty"));
    }
    store.set(provider, key.trim())
}

pub fn has_secret(store: &dyn SecretStore, provider: &str) -> Result<bool, SecretError> {
    check_provider(provider)?;
    store.has(provider)
}

pub fn clear_secret(store: &dyn SecretStore, provider: &str) -> Result<(), SecretError> {
    check_provider(provider)?;
    store.clear(provider)
}

#[tauri::command]
pub fn secret_set(provider: String, key: String) -> Result<(), SecretError> {
    set_secret(&KeychainStore, &provider, &key)
}

#[tauri::command]
pub fn secret_has(provider: String) -> Result<bool, SecretError> {
    has_secret(&KeychainStore, &provider)
}

#[tauri::command]
pub fn secret_clear(provider: String) -> Result<(), SecretError> {
    clear_secret(&KeychainStore, &provider)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    #[derive(Default)]
    struct MemoryStore(RefCell<HashMap<String, String>>);

    impl SecretStore for MemoryStore {
        fn set(&self, provider: &str, key: &str) -> Result<(), SecretError> {
            self.0.borrow_mut().insert(provider.into(), key.into());
            Ok(())
        }
        fn has(&self, provider: &str) -> Result<bool, SecretError> {
            Ok(self.0.borrow().contains_key(provider))
        }
        fn clear(&self, provider: &str) -> Result<(), SecretError> {
            self.0.borrow_mut().remove(provider);
            Ok(())
        }
        fn get(&self, provider: &str) -> Result<Option<String>, SecretError> {
            Ok(self.0.borrow().get(provider).cloned())
        }
    }

    #[test]
    fn set_has_clear_round_trip() {
        let store = MemoryStore::default();
        assert_eq!(has_secret(&store, "anthropic"), Ok(false));
        set_secret(&store, "anthropic", " sk-test ").unwrap();
        assert_eq!(has_secret(&store, "anthropic"), Ok(true));
        assert_eq!(store.get("anthropic"), Ok(Some("sk-test".to_string())));
        clear_secret(&store, "anthropic").unwrap();
        assert_eq!(has_secret(&store, "anthropic"), Ok(false));
    }

    #[test]
    fn rejects_unknown_providers_and_empty_keys() {
        let store = MemoryStore::default();
        assert!(set_secret(&store, "../etc", "k").is_err());
        assert!(has_secret(&store, "nope").is_err());
        assert!(set_secret(&store, "openai", "   ").is_err());
        assert_eq!(has_secret(&store, "openai"), Ok(false));
    }

    #[test]
    fn errors_never_contain_the_key() {
        let store = MemoryStore::default();
        let err = set_secret(&store, "bad", "sk-secret").unwrap_err();
        assert!(!err.message.contains("sk-secret"));
    }
}
