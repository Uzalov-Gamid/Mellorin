use crate::config::Config;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
pub struct Preferences {
    pub vault_path: String,
    pub claude_path: String,
    pub theme: String,
    pub text_size: u8,
}

fn expanded(value: &str) -> anyhow::Result<PathBuf> {
    anyhow::ensure!(
        !value.trim().is_empty() && !value.chars().any(char::is_control),
        "Путь пуст или содержит управляющие символы"
    );
    if value == "~" || value.starts_with("~/") {
        Ok(dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Домашняя папка недоступна"))?
            .join(value.strip_prefix("~/").unwrap_or("")))
    } else {
        Ok(PathBuf::from(value))
    }
}

impl Preferences {
    pub fn validate(&self) -> anyhow::Result<()> {
        let vault = expanded(&self.vault_path)?;
        anyhow::ensure!(
            vault.is_absolute() && vault.is_dir(),
            "Хранилище: нужна существующая абсолютная папка"
        );
        let cli = expanded(&self.claude_path)?;
        anyhow::ensure!(
            self.claude_path == "claude" || (cli.is_absolute() && cli.is_file()),
            "Claude Code: нужен claude из PATH или абсолютный путь к файлу"
        );
        #[cfg(unix)]
        if self.claude_path != "claude" {
            use std::os::unix::fs::PermissionsExt;
            anyhow::ensure!(
                cli.metadata()?.permissions().mode() & 0o111 != 0,
                "Claude Code: файл не исполняемый"
            );
        }
        anyhow::ensure!(self.theme == "light", "Пока доступна только светлая тема");
        anyhow::ensure!(
            (12..=18).contains(&self.text_size),
            "Размер текста: от 12 до 18"
        );
        Ok(())
    }

    pub fn changes_process(&self, old: &Config) -> anyhow::Result<bool> {
        Ok(expanded(&self.vault_path)?.canonicalize()?
            != Path::new(&old.vault_path)
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(&old.vault_path))
            || expanded(&self.claude_path)? != expanded(&old.claude_path)?)
    }

    pub fn save(&self, dir: &Path) -> anyhow::Result<()> {
        self.validate()?;
        Config::save_settings(
            dir,
            &expanded(&self.vault_path)?.to_string_lossy(),
            &expanded(&self.claude_path)?.to_string_lossy(),
            &self.theme,
            self.text_size,
        )
    }
}

#[derive(Serialize)]
pub struct Diagnostics {
    pub data_directory: String,
    pub vault_found: bool,
    pub learning_found: bool,
    pub cli_available: bool,
}

pub async fn diagnostics(config: &Config, data_directory: String) -> Diagnostics {
    let cli_available = matches!(tokio::time::timeout(std::time::Duration::from_secs(5), tokio::process::Command::new(&config.claude_path).arg("--version").stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).kill_on_drop(true).status()).await, Ok(Ok(status)) if status.success());
    Diagnostics {
        data_directory,
        vault_found: Path::new(&config.vault_path).is_dir(),
        learning_found: Path::new(&config.vault_path).join("Learning").is_dir(),
        cli_available,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_meaningful_paths_change_process() {
        let dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let old = Config {
            vault_path: dir.path().to_string_lossy().into(),
            ..Config::default()
        };
        let mut prefs = Preferences {
            vault_path: dir.path().join(".").to_string_lossy().into(),
            claude_path: "claude".into(),
            theme: "light".into(),
            text_size: 18,
        };
        assert!(!prefs.changes_process(&old).unwrap());
        prefs.vault_path = other.path().to_string_lossy().into();
        assert!(prefs.changes_process(&old).unwrap());
        prefs.vault_path = "\0invalid".into();
        assert!(prefs.validate().is_err());
    }

    #[tokio::test]
    async fn diagnostics_use_version_only() {
        let dir = tempfile::tempdir().unwrap();
        let cli = dir.path().join("cli");
        std::fs::write(
            &cli,
            "#!/bin/sh\n[ \"$#\" = 1 ] && [ \"$1\" = --version ]\n",
        )
        .unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&cli, std::fs::Permissions::from_mode(0o700)).unwrap();
        }
        let config = Config {
            vault_path: dir.path().to_string_lossy().into(),
            claude_path: cli.to_string_lossy().into(),
            ..Config::default()
        };
        let result = diagnostics(&config, "synthetic-config".into()).await;
        assert!(result.cli_available);
        assert!(result.vault_found);
        assert!(!result.learning_found);
    }

    #[test]
    fn validates_paths_and_preserves_unowned_keys() {
        let dir = tempfile::tempdir().unwrap();
        let vault = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("mellorin.toml"), "jery_ticktick = 'read'\njery_can_edit_vault = false\ncustom = 'keep'\n[extra]\nvalue = 7\n").unwrap();
        let mut prefs = Preferences {
            vault_path: vault.path().to_string_lossy().into(),
            claude_path: "claude".into(),
            theme: "light".into(),
            text_size: 16,
        };
        prefs.save(dir.path()).unwrap();
        let text = std::fs::read_to_string(dir.path().join("mellorin.toml")).unwrap();
        let value: toml::Value = toml::from_str(&text).unwrap();
        assert_eq!(value["custom"].as_str(), Some("keep"));
        assert_eq!(value["extra"]["value"].as_integer(), Some(7));
        assert_eq!(value["jery_ticktick"].as_str(), Some("read"));
        assert_eq!(value["jery_can_edit_vault"].as_bool(), Some(false));
        prefs.vault_path = "relative".into();
        assert!(prefs.save(dir.path()).is_err());
        assert_eq!(
            std::fs::read_to_string(dir.path().join("mellorin.toml")).unwrap(),
            text
        );
        prefs.vault_path = vault.path().to_string_lossy().into();
        prefs.claude_path = "--version".into();
        assert!(prefs.validate().is_err());
        prefs.claude_path = "claude".into();
        prefs.text_size = 99;
        assert!(prefs.validate().is_err());
    }
}
