use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Manager;

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TickTickMode {
    #[default]
    Full,
    Read,
    Off,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct Config {
    pub vault_path: String,
    pub claude_path: String,
    pub theme: String,
    pub text_size: u8,
    pub jery_can_edit_vault: bool,
    pub jery_ticktick: TickTickMode,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            vault_path: "~/MellorinVault".into(),
            claude_path: "claude".into(),
            theme: "light".into(),
            text_size: 14,
            jery_can_edit_vault: true,
            jery_ticktick: TickTickMode::Full,
        }
    }
}

impl Config {
    pub fn load(app: &tauri::AppHandle) -> anyhow::Result<Self> {
        Self::load_from(&app.path().app_config_dir()?)
    }

    pub fn set_edit_permission(app: &tauri::AppHandle, enabled: bool) -> anyhow::Result<()> {
        Self::save_edit_permission(&app.path().app_config_dir()?, enabled)
    }

    pub fn set_ticktick(app: &tauri::AppHandle, mode: TickTickMode) -> anyhow::Result<()> {
        Self::save_value(
            &app.path().app_config_dir()?,
            "jery_ticktick",
            toml::Value::try_from(mode)?,
        )
    }

    fn save_edit_permission(dir: &Path, enabled: bool) -> anyhow::Result<()> {
        Self::save_value(dir, "jery_can_edit_vault", toml::Value::Boolean(enabled))
    }

    pub fn save_settings(
        dir: &Path,
        vault: &str,
        claude: &str,
        theme: &str,
        text_size: u8,
    ) -> anyhow::Result<()> {
        Self::save_values(
            dir,
            &[
                ("vault_path", toml::Value::String(vault.into())),
                ("claude_path", toml::Value::String(claude.into())),
                ("theme", toml::Value::String(theme.into())),
                ("text_size", toml::Value::Integer(text_size.into())),
            ],
        )
    }

    fn save_value(dir: &Path, key: &str, value: toml::Value) -> anyhow::Result<()> {
        Self::save_values(dir, &[(key, value)])
    }

    fn save_values(dir: &Path, values: &[(&str, toml::Value)]) -> anyhow::Result<()> {
        Self::load_from(dir)?;
        let path = dir.join("mellorin.toml");
        let mut document: toml::Value = toml::from_str(&std::fs::read_to_string(&path)?)?;
        let table = document
            .as_table_mut()
            .ok_or_else(|| anyhow::anyhow!("config must be a table"))?;
        for (key, value) in values {
            table.insert((*key).into(), value.clone());
        }
        let mut temporary = tempfile::NamedTempFile::new_in(dir)?;
        use std::io::Write;
        temporary
            .as_file()
            .set_permissions(std::fs::metadata(&path)?.permissions())?;
        temporary.write_all(toml::to_string_pretty(&document)?.as_bytes())?;
        temporary.as_file().sync_all()?;
        temporary.persist(path)?;
        Ok(())
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
    fn ticktick_mode_is_validated_and_preserves_other_keys() {
        let dir = tempfile::tempdir().unwrap();
        Config::load_from(dir.path()).unwrap();
        Config::save_value(
            dir.path(),
            "jery_ticktick",
            toml::Value::String("read".into()),
        )
        .unwrap();
        assert_eq!(
            Config::load_from(dir.path()).unwrap().jery_ticktick,
            TickTickMode::Read
        );
        Config::save_edit_permission(dir.path(), false).unwrap();
        assert_eq!(
            Config::load_from(dir.path()).unwrap().jery_ticktick,
            TickTickMode::Read
        );
        assert!(toml::from_str::<Config>("jery_ticktick = 'unknown'").is_err());
    }

    #[test]
    fn creates_defaults_and_preserves_existing_config() {
        let dir = tempfile::tempdir().unwrap();
        let config = Config::load_from(dir.path()).unwrap();
        assert!(Path::new(&config.vault_path).is_absolute());
        assert_eq!(config.claude_path, "claude");
        assert_eq!(config.theme, "light");
        let path = dir.path().join("mellorin.toml");
        let saved: Config = toml::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(saved, Config::default());
        std::fs::write(
            path,
            "vault_path = '/tmp/vault'\nclaude_path = 'custom'\ntheme = 'dark'\n",
        )
        .unwrap();
        assert_eq!(Config::load_from(dir.path()).unwrap().claude_path, "custom");
        assert!(Config::load_from(dir.path()).unwrap().jery_can_edit_vault);
        let original = std::fs::read_to_string(dir.path().join("mellorin.toml")).unwrap();
        std::fs::write(
            dir.path().join("mellorin.toml"),
            format!("{original}custom_key = 'keep'\n"),
        )
        .unwrap();
        Config::save_edit_permission(dir.path(), false).unwrap();
        let updated = Config::load_from(dir.path()).unwrap();
        assert!(!updated.jery_can_edit_vault);
        assert_eq!(updated.claude_path, "custom");
        let document: toml::Value =
            toml::from_str(&std::fs::read_to_string(dir.path().join("mellorin.toml")).unwrap())
                .unwrap();
        assert_eq!(document["custom_key"].as_str(), Some("keep"));
        Config::save_edit_permission(dir.path(), true).unwrap();
        assert!(Config::load_from(dir.path()).unwrap().jery_can_edit_vault);
    }
}
