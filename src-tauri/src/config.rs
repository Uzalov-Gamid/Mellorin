use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct Config {
    pub vault_path: String,
    pub claude_path: String,
    pub theme: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            vault_path: "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/MainStorage"
                .into(),
            claude_path: "claude".into(),
            theme: "dark".into(),
        }
    }
}

impl Config {
    pub fn load(app: &tauri::AppHandle) -> anyhow::Result<Self> {
        Self::load_from(&app.path().app_config_dir()?)
    }

    fn load_from(dir: &Path) -> anyhow::Result<Self> {
        std::fs::create_dir_all(dir)?;
        let path = dir.join("mellorin.toml");
        let mut config: Self = match std::fs::read_to_string(&path) {
            Ok(text) => toml::from_str(&text)?,
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                let config = Self::default();
                std::fs::write(&path, toml::to_string_pretty(&config)?)?;
                config
            }
            Err(err) => return Err(err.into()),
        };
        if config.vault_path == "~" || config.vault_path.starts_with("~/") {
            let home =
                dirs::home_dir().ok_or_else(|| anyhow::anyhow!("home directory unavailable"))?;
            config.vault_path = home
                .join(config.vault_path.strip_prefix("~/").unwrap_or(""))
                .to_string_lossy()
                .into_owned();
        }
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_defaults_and_preserves_existing_config() {
        let dir = tempfile::tempdir().unwrap();
        let config = Config::load_from(dir.path()).unwrap();
        assert!(Path::new(&config.vault_path).is_absolute());
        assert_eq!(config.claude_path, "claude");
        assert_eq!(config.theme, "dark");
        let path = dir.path().join("mellorin.toml");
        let saved: Config = toml::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(saved, Config::default());
        std::fs::write(
            path,
            "vault_path = '/tmp/vault'\nclaude_path = 'custom'\ntheme = 'dark'\n",
        )
        .unwrap();
        assert_eq!(Config::load_from(dir.path()).unwrap().claude_path, "custom");
    }
}
