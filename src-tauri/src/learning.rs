use crate::vault;
use anyhow::{ensure, Context};
use serde_json::Value;
use std::path::Path;

#[derive(serde::Serialize)]
pub struct Snapshot {
    pub state: Option<Value>,
    pub today: Option<Value>,
    pub errors: Vec<String>,
}

fn text<'a>(value: &'a Value, key: &str, required: bool) -> anyhow::Result<Option<&'a str>> {
    match value.get(key) {
        None if !required => Ok(None),
        field => {
            let text = field
                .and_then(Value::as_str)
                .with_context(|| format!("{key}: expected text"))?;
            ensure!(
                !text.trim().is_empty() && text.len() <= 4096,
                "{key}: empty or too long"
            );
            Ok(Some(text))
        }
    }
}
fn items<'a>(value: &'a Value, key: &str, required: bool) -> anyhow::Result<&'a [Value]> {
    match value.get(key) {
        None if !required => Ok(&[]),
        field => {
            let items = field
                .and_then(Value::as_array)
                .with_context(|| format!("{key}: expected array"))?;
            ensure!(items.len() <= 1000, "{key}: too many entries");
            Ok(items)
        }
    }
}
fn identifier(value: &Value, key: &str) -> anyhow::Result<()> {
    let id = text(value, key, true)?.unwrap();
    ensure!(
        id.chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_'),
        "{key}: invalid identifier"
    );
    Ok(())
}
fn count(value: &Value, key: &str, required: bool) -> anyhow::Result<()> {
    if required || value.get(key).is_some() {
        ensure!(
            value[key].as_u64().is_some_and(|n| n <= 1_000_000),
            "{key}: expected nonnegative integer"
        );
    }
    Ok(())
}
fn date(value: &Value, key: &str, required: bool) -> anyhow::Result<()> {
    if let Some(date) = text(value, key, required)? {
        ensure!(
            date.len() == 10
                && date.as_bytes()[4] == b'-'
                && date.as_bytes()[7] == b'-'
                && date
                    .bytes()
                    .enumerate()
                    .all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit()),
            "{key}: expected YYYY-MM-DD"
        );
        let parts: Vec<u32> = date
            .split('-')
            .filter_map(|part| part.parse().ok())
            .collect();
        ensure!(
            date.len() == 10 && parts.len() == 3,
            "{key}: expected YYYY-MM-DD"
        );
        let (year, month, day) = (parts[0], parts[1], parts[2]);
        let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        let days = match month {
            2 if leap => 29,
            2 => 28,
            4 | 6 | 9 | 11 => 30,
            1..=12 => 31,
            _ => 0,
        };
        ensure!(
            year > 0 && year <= 9999 && day > 0 && day <= days,
            "{key}: invalid calendar date"
        );
    }
    Ok(())
}

pub fn validate(value: Value, today: bool) -> anyhow::Result<Value> {
    ensure!(
        value.is_object() && value["version"] == 1,
        "expected object with version 1"
    );
    if today {
        date(&value, "date", true)?;
        let mut ids = std::collections::HashSet::new();
        for task in items(&value, "tasks", true)? {
            identifier(task, "id")?;
            identifier(task, "subject")?;
            text(task, "title", true)?;
            ensure!(
                ids.insert(task["id"].as_str().unwrap()),
                "duplicate task id"
            );
            ensure!(task["done"].is_boolean(), "done: expected boolean");
            for key in ["skill", "hint", "time", "tag", "completedAt"] {
                text(task, key, false)?;
            }
        }
    } else {
        let mut ids = std::collections::HashSet::new();
        for subject in items(&value, "subjects", true)? {
            identifier(subject, "id")?;
            text(subject, "name", true)?;
            ensure!(
                ids.insert(subject["id"].as_str().unwrap()),
                "duplicate subject id"
            );
            if let Some(percent) = subject.get("percent") {
                ensure!(
                    percent.as_f64().is_some_and(|n| (0.0..=100.0).contains(&n)),
                    "percent must be 0..100"
                );
            }
            for key in ["stage", "next"] {
                text(subject, key, false)?;
            }
            let mut skills = std::collections::HashSet::new();
            for node in items(subject, "trail", true)? {
                identifier(node, "id")?;
                text(node, "label", true)?;
                text(node, "text", false)?;
                ensure!(
                    skills.insert(node["id"].as_str().unwrap()),
                    "duplicate trail id"
                );
                ensure!(
                    matches!(
                        node["status"].as_str(),
                        Some("passed" | "current" | "future")
                    ),
                    "invalid trail status"
                );
            }
            for tail in items(subject, "tails", false)? {
                text(tail, "title", true)?;
                date(tail, "date", false)?;
            }
        }
        for item in items(&value, "dates", false)? {
            text(item, "title", true)?;
            date(item, "date", false)?;
        }
        for item in items(&value, "sessions", false)? {
            date(item, "date", true)?;
            identifier(item, "subject")?;
            text(item, "skill", false)?;
            count(item, "count", false)?;
        }
        for key in ["repeats", "errors"] {
            for item in items(&value, key, false)? {
                text(item, "title", true)?;
                identifier(item, "subject")?;
                text(item, "screen", false)?;
                count(item, "count", key == "errors")?;
            }
        }
    }
    Ok(value)
}

pub fn snapshot(vault: &Path) -> Snapshot {
    let mut errors = Vec::new();
    let mut read = |name: &str, today: bool| -> Option<Value> {
        let path = format!(".mellorin/{name}.json");
        match vault::read_text(vault, &path)
            .and_then(|text| validate(serde_json::from_str(&text)?, today))
        {
            Ok(value) => Some(value),
            Err(error) => {
                let missing = error
                    .downcast_ref::<std::io::Error>()
                    .is_some_and(|e| e.kind() == std::io::ErrorKind::NotFound);
                if !missing {
                    errors.push(format!("{path}: {error}"));
                }
                None
            }
        }
    };
    let state = read("state", false);
    let today = read("today", true);
    Snapshot {
        state,
        today,
        errors,
    }
}

pub fn init_protocol(vault: &Path, prompt: &str) -> anyhow::Result<()> {
    use std::io::Write;
    ensure!(
        !prompt.is_empty() && prompt.len() <= 4096,
        "invalid refresh prompt"
    );
    let root = vault.canonicalize()?;
    std::fs::create_dir_all(root.join(".mellorin"))?;
    let directory = vault::resolve_inside(&root, ".mellorin")?;
    let path = directory.join("README.md");
    let exists = path.exists();
    let existing = if exists {
        vault::read_text(&root, ".mellorin/README.md")?
    } else {
        String::new()
    };
    let mut body = String::new();
    if !existing.contains("# Mellorin state protocol v1") {
        body.push_str(&format!("# Mellorin state protocol v1\n\nUse lowercase folder subject ids (english, devops, arabic, c, sql); skill ids match the sidebar. Only refresh on a user request. Never invent data; omit unavailable values. Keep the vault Markdown notes as the source. Write UTF-8 JSON using a temporary file and rename.\n\nExact refresh prompt:\n\n{prompt}\n\nstate.json schema:\n```json\n{}\n```\n\ntoday.json schema:\n```json\n{}\n```\n", include_str!("../../docs/state.schema.json"), include_str!("../../docs/today.schema.json")));
    }
    if !existing.contains("# Mellorin reply protocol v1") {
        body.push_str("\n\n");
        body.push_str(include_str!("../../docs/jery-protocol.md"));
    }
    if body.is_empty() {
        return Ok(());
    }
    let mut options = std::fs::OpenOptions::new();
    options.write(true);
    if exists {
        options.append(true);
    } else {
        options.create_new(true);
    }
    let mut file = options.open(path)?;
    if exists {
        file.write_all(b"\n\n")?;
    }
    file.write_all(body.as_bytes())?;
    file.sync_all()?;
    Ok(())
}

pub fn set_task_done(
    vault: &Path,
    id: &str,
    done: bool,
    expected_date: &str,
) -> anyhow::Result<()> {
    let path = vault::resolve_inside(vault, ".mellorin/today.json")?;
    let mut today = validate(
        serde_json::from_str(&vault::read_text(vault, ".mellorin/today.json")?)?,
        true,
    )?;
    ensure!(
        today["date"].as_str() == Some(expected_date),
        "task date changed; refresh before updating"
    );
    let task = today["tasks"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|task| task["id"].as_str() == Some(id))
        .context("task no longer exists")?;
    task["done"] = Value::Bool(done);
    if !done {
        task.as_object_mut().unwrap().remove("completedAt");
    }
    let today = validate(today, true)?;
    vault::replace_file(&path, serde_json::to_string_pretty(&today)?.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn validates_state_and_tolerates_missing_or_invalid_files() {
        let dir = tempfile::tempdir().unwrap();
        assert!(snapshot(dir.path()).state.is_none());
        assert!(snapshot(dir.path()).errors.is_empty());
        init_protocol(dir.path(), "synthetic refresh").unwrap();
        let readme = dir.path().join(".mellorin/README.md");
        assert!(std::fs::read_to_string(&readme)
            .unwrap()
            .contains("synthetic refresh"));
        std::fs::write(&readme, "keep custom instructions").unwrap();
        init_protocol(dir.path(), "different").unwrap();
        let instructions = std::fs::read_to_string(readme).unwrap();
        assert!(instructions.starts_with("keep custom instructions\n"));
        assert!(instructions.contains("different"));
        let state = json!({"version":1,"subjects":[{"id":"english","name":"English","percent":25,"trail":[{"id":"reading","label":"Чтение","status":"current"}]}]});
        assert!(validate(state.clone(), false).is_ok());
        let mut invalid = state;
        invalid["subjects"][0]["percent"] = json!(101);
        assert!(validate(invalid, false).is_err());
        std::fs::write(dir.path().join(".mellorin/state.json"), "{invalid").unwrap();
        assert_eq!(snapshot(dir.path()).errors.len(), 1);
    }
    #[test]
    fn appends_reply_protocol_to_existing_state_instructions_once() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".mellorin")).unwrap();
        let path = dir.path().join(".mellorin/README.md");
        std::fs::write(
            &path,
            "Custom rules\n# Mellorin state protocol v1\nOld state rules",
        )
        .unwrap();
        init_protocol(dir.path(), "refresh").unwrap();
        init_protocol(dir.path(), "refresh").unwrap();
        let text = std::fs::read_to_string(path).unwrap();
        assert!(text.starts_with("Custom rules\n# Mellorin state protocol v1\nOld state rules"));
        assert_eq!(text.matches("# Mellorin reply protocol v1").count(), 1);
    }
    #[test]
    fn validates_today_dates_tasks_and_duplicates() {
        let valid = json!({"version":1,"date":"2026-11-15","tasks":[{"id":"one","title":"Synthetic","subject":"english","done":false}]});
        assert!(validate(valid.clone(), true).is_ok());
        let mut invalid = valid.clone();
        invalid["date"] = json!("2026-02-30");
        assert!(validate(invalid, true).is_err());
        let mut invalid = valid.clone();
        invalid["tasks"][0]["done"] = json!("yes");
        assert!(validate(invalid, true).is_err());
        let mut invalid = valid;
        let duplicate = invalid["tasks"][0].clone();
        invalid["tasks"].as_array_mut().unwrap().push(duplicate);
        assert!(validate(invalid, true).is_err());
    }
}

#[cfg(test)]
mod task_tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn updates_only_requested_task_and_rejects_stale_or_missing_ids() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".mellorin")).unwrap();
        let path = dir.path().join(".mellorin/today.json");
        let original = json!({"version":1,"date":"2026-11-15","tasks":[{"id":"one","title":"Demo","subject":"english","done":false},{"id":"two","title":"Keep","subject":"c","done":true,"completedAt":"11:00"}]});
        std::fs::write(&path, original.to_string()).unwrap();
        assert!(set_task_done(dir.path(), "one", true, "2026-11-14").is_err());
        assert!(set_task_done(dir.path(), "missing", true, "2026-11-15").is_err());
        assert_eq!(
            serde_json::from_str::<Value>(&std::fs::read_to_string(&path).unwrap()).unwrap(),
            original
        );
        set_task_done(dir.path(), "one", true, "2026-11-15").unwrap();
        let actual: Value = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        assert_eq!(actual["tasks"][0]["done"], true);
        assert_eq!(actual["tasks"][1], original["tasks"][1]);
    }
}
