use crate::config::{Config, TickTickMode};
use serde::Serialize;
use tokio::process::Command;

pub const SERVER: &str = "mcp__claude_ai_TickTick";

pub fn allow_rules(mode: TickTickMode) -> Vec<String> {
    match mode {
        TickTickMode::Full => vec![SERVER.into()],
        TickTickMode::Off => vec![],
        TickTickMode::Read => [
            "list_*",
            "get_*",
            "filter_tasks",
            "search*",
            "query_calendar_events",
            "list_calendars",
            "fetch",
        ]
        .iter()
        .map(|name| format!("{SERVER}__{name}"))
        .collect(),
    }
}

pub fn configure(command: &mut Command, mode: TickTickMode) {
    let rules = allow_rules(mode);
    if !rules.is_empty() {
        command.arg("--allowedTools").args(rules);
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionStatus {
    Connected,
    NeedsAuthentication,
    NotFound,
    Unavailable,
}

pub fn parse_status(text: &str) -> ConnectionStatus {
    let Some(line) = text.lines().find(|line| line.contains("TickTick")) else {
        return ConnectionStatus::NotFound;
    };
    let line = line.to_lowercase();
    if line.contains("needs authentication") || line.contains("not authenticated") {
        ConnectionStatus::NeedsAuthentication
    } else if line.contains("connected") && !line.contains("disconnected") {
        ConnectionStatus::Connected
    } else {
        ConnectionStatus::Unavailable
    }
}

pub async fn status(config: &Config) -> ConnectionStatus {
    let mut command = Command::new(&config.claude_path);
    command
        .args(["mcp", "list"])
        .current_dir(&config.vault_path)
        .stdin(std::process::Stdio::null())
        .kill_on_drop(true);
    match tokio::time::timeout(std::time::Duration::from_secs(15), command.output()).await {
        Ok(Ok(output)) if output.status.success() => {
            parse_status(&String::from_utf8_lossy(&output.stdout))
        }
        _ => ConnectionStatus::Unavailable,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn modes_configure_only_ticktick_capability() {
        for mode in [TickTickMode::Full, TickTickMode::Read, TickTickMode::Off] {
            let mut command = Command::new("synthetic-claude");
            configure(&mut command, mode);
            let args: Vec<_> = command
                .as_std()
                .get_args()
                .map(|v| v.to_string_lossy().into_owned())
                .collect();
            let rules = allow_rules(mode);
            if mode == TickTickMode::Off {
                assert!(args.is_empty());
            } else {
                assert_eq!(args[0], "--allowedTools");
                assert_eq!(&args[1..], rules);
                assert!(rules.iter().all(|r| r.starts_with(SERVER)));
            }
            if mode == TickTickMode::Read {
                assert!(!rules.contains(&SERVER.into()));
                assert!(rules.contains(&format!("{SERVER}__list_*")));
                assert!(!rules
                    .iter()
                    .any(|r| r.contains("create") || r.contains("delete") || r.contains("update")));
            }
        }
    }
    #[test]
    fn connection_states_do_not_confuse_auth_failure_with_connected() {
        assert_eq!(
            parse_status("claude.ai TickTick: https://example.test - ✔ Connected"),
            ConnectionStatus::Connected
        );
        assert_eq!(
            parse_status("TickTick: Needs authentication"),
            ConnectionStatus::NeedsAuthentication
        );
        assert_eq!(
            parse_status("TickTick: Disconnected"),
            ConnectionStatus::Unavailable
        );
        assert_eq!(parse_status("Other: Connected"), ConnectionStatus::NotFound);
    }
}
