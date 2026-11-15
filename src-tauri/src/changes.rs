//! User-click-only, journaled two-file format transactions. No subprocess or code execution.
use anyhow::{bail, ensure, Context};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
static LOCK: Mutex<()> = Mutex::new(());
const LIMIT: usize = 262144;
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Proposal {
    pub target: String,
    pub before: Option<String>,
    pub after: String,
    pub process: String,
    pub process_before: Option<String>,
    pub rule: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Preview {
    pub proposal: Proposal,
    pub process_after: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Record {
    pub id: String,
    pub target: String,
    pub process: String,
    pub before: Option<String>,
    pub after: Option<String>,
    pub process_before: Option<String>,
    pub process_after: Option<String>,
}
fn simple(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s.as_bytes()[0].is_ascii_alphabetic()
        && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}
fn paths(target: &str, process: &str) -> anyhow::Result<()> {
    let name = target
        .strip_prefix("formats/")
        .and_then(|s| s.strip_suffix(".json"))
        .context("expected formats/<subject>-<skill>.json")?;
    let parts: Vec<_> = process.split('/').collect();
    ensure!(
        parts.len() == 4
            && parts[0] == "Learning"
            && parts[3] == "process.md"
            && simple(parts[1])
            && simple(parts[2]),
        "expected Learning/<Subject>/<Skill>/process.md"
    );
    ensure!(
        simple(name)
            && name
                == format!(
                    "{}-{}",
                    parts[1].to_ascii_lowercase(),
                    parts[2].to_ascii_lowercase()
                ),
        "format and process subject/skill mismatch"
    );
    Ok(())
}
// Reject symlinks on every component, including dangling links. Parents must exist.
fn safe(root: &Path, rel: &str) -> anyhow::Result<PathBuf> {
    let root = root.canonicalize()?;
    let mut path = root.clone();
    for part in Path::new(rel).components() {
        ensure!(
            matches!(part, std::path::Component::Normal(_)),
            "unsafe path"
        );
        path.push(part);
        match fs::symlink_metadata(&path) {
            Ok(m) => ensure!(!m.file_type().is_symlink(), "symlink rejected"),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.into()),
        }
    }
    ensure!(
        path.parent()
            .context("parent")?
            .canonicalize()?
            .starts_with(root),
        "outside vault"
    );
    Ok(path)
}
fn read(path: &Path) -> anyhow::Result<Option<String>> {
    read_limit(path, LIMIT)
}
fn read_limit(path: &Path, limit: usize) -> anyhow::Result<Option<String>> {
    match fs::metadata(path) {
        Ok(m) => {
            ensure!(
                m.is_file() && m.len() <= limit as u64,
                "file too large or not regular"
            );
            Ok(Some(fs::read_to_string(path)?))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}
fn bounded(v: &serde_json::Value, depth: usize, count: &mut usize) -> anyhow::Result<()> {
    *count += 1;
    ensure!(*count <= 10000 && depth <= 8, "format structure too large");
    match v {
        serde_json::Value::String(s) => {
            ensure!(s.chars().count() <= 20000, "format string too long")
        }
        serde_json::Value::Array(a) => {
            ensure!(a.len() <= 100, "too many entries");
            for x in a {
                bounded(x, depth + 1, count)?;
            }
        }
        serde_json::Value::Object(o) => {
            ensure!(o.len() <= 100, "too many entries");
            for x in o.values() {
                bounded(x, depth + 1, count)?;
            }
        }
        _ => {}
    }
    Ok(())
}
fn format_valid(s: &str) -> anyhow::Result<()> {
    ensure!(s.len() <= LIMIT, "format too large");
    let v: serde_json::Value = serde_json::from_str(s)?;
    bounded(&v, 0, &mut 0)?;
    ensure!(v["version"] == 1, "format version");
    let steps = v["steps"].as_array().context("steps")?;
    ensure!(!steps.is_empty(), "empty steps");
    let mut ids = std::collections::HashSet::new();
    for step in steps {
        let id = step["id"].as_str().context("step id")?;
        ensure!(
            simple(id)
                && id == id.to_ascii_lowercase()
                && ids.insert(id)
                && step["title"].is_string(),
            "invalid step"
        );
        for b in step["blocks"].as_array().context("blocks")? {
            let t = b["type"].as_str().context("block type")?;
            ensure!(
                simple(t) && t == t.to_ascii_lowercase() && b["props"].is_object(),
                "invalid block"
            );
            if let Some(w) = b.get("writeBack") {
                let o = w.as_object().context("writeBack")?;
                let intent = w["intent"].as_str().context("intent")?;
                ensure!(
                    o.len() == 1 && !intent.trim().is_empty() && intent.chars().count() <= 500,
                    "only writeBack intent allowed"
                );
            }
        }
    }
    Ok(())
}
fn preview_inner(root: &Path, p: Proposal) -> anyhow::Result<Preview> {
    paths(&p.target, &p.process)?;
    format_valid(&p.after)?;
    if let Some(b) = &p.before {
        format_valid(b)?;
    }
    ensure!(
        !p.rule.trim().is_empty() && p.rule.len() <= 20000 && !p.rule.contains("<!-- mellorin:"),
        "invalid rule"
    );
    ensure!(
        read(&safe(root, &p.target)?)? == p.before
            && read(&safe(root, &p.process)?)? == p.process_before,
        "stale proposal: reload both files"
    );
    let old = p.process_before.as_deref().unwrap_or("");
    let start = "<!-- mellorin:format-rule -->";
    let end = "<!-- mellorin:end -->";
    ensure!(!p.rule.contains(end), "invalid rule marker");
    let section = format!("{start}\n{}\n{end}", p.rule);
    let process_after = match (old.find(start), old.find(end)) {
        (None, None) => format!("{old}\n\n{section}\n"),
        (Some(a), Some(b))
            if b > a && old.matches(start).count() == 1 && old.matches(end).count() == 1 =>
        {
            format!("{}{}{}", &old[..a], section, &old[b + end.len()..])
        }
        _ => bail!("ambiguous rule section"),
    };
    ensure!(process_after.len() <= LIMIT, "process too large");
    Ok(Preview {
        proposal: p,
        process_after,
    })
}
pub fn preview(root: &Path, p: Proposal) -> anyhow::Result<Preview> {
    let _g = LOCK.lock().unwrap();
    preview_inner(root, p)
}
fn atomic(path: &Path, text: Option<&str>) -> anyhow::Result<()> {
    if let Some(text) = text {
        let temp = path.with_file_name(format!(".mellorin-{}.tmp", stamp()));
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut f = options.open(&temp)?;
        if let Ok(metadata) = fs::metadata(path) {
            f.set_permissions(metadata.permissions())?;
        }
        f.write_all(text.as_bytes())?;
        f.sync_all()?;
        fs::rename(&temp, path)?;
    } else if path.exists() {
        fs::remove_file(path)?;
    }
    fs::File::open(path.parent().context("parent")?)?.sync_all()?;
    Ok(())
}
fn stamp() -> String {
    format!(
        "{}-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        std::process::id()
    )
}
fn history(root: &Path) -> anyhow::Result<PathBuf> {
    let formats = safe(root, "formats")?;
    ensure!(formats.is_dir(), "formats directory missing");
    let dir = formats.join(".history");
    if !dir.exists() {
        fs::create_dir(&dir)?;
    }
    safe(root, "formats/.history")
}
fn journal_path(root: &Path, id: &str) -> anyhow::Result<PathBuf> {
    ensure!(
        !id.is_empty()
            && id.len() <= 160
            && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-'),
        "invalid history id"
    );
    history(root)?;
    safe(root, &format!("formats/.history/{id}.json"))
}
fn finish(root: &Path, r: &Record) -> anyhow::Result<()> {
    paths(&r.target, &r.process)?;
    for text in [&r.before, &r.after].into_iter().flatten() {
        format_valid(text)?;
    }
    for text in [&r.process_before, &r.process_after].into_iter().flatten() {
        ensure!(text.len() <= LIMIT, "process too large");
    }

    let a = safe(root, &r.target)?;
    let b = safe(root, &r.process)?;
    let current_a = read(&a)?;
    let current_b = read(&b)?;
    ensure!(
        (current_a == r.before || current_a == r.after)
            && (current_b == r.process_before || current_b == r.process_after),
        "recovery conflict: files changed; journal retained"
    );
    if current_a != r.after {
        atomic(&a, r.after.as_deref())?;
    }
    if current_b != r.process_after {
        atomic(&b, r.process_after.as_deref())?;
    }
    let pending = safe(root, "formats/.history/pending.json")?;
    fs::remove_file(pending)?;
    fs::File::open(history(root)?)?.sync_all()?;
    Ok(())
}
fn transact(root: &Path, r: Record) -> anyhow::Result<Record> {
    let dest = journal_path(root, &r.id)?;
    let pending = safe(root, "formats/.history/pending.json")?;
    ensure!(!pending.exists(), "unfinished change: recover first");
    if let Some(previous) = &r.before {
        let name = r
            .target
            .trim_start_matches("formats/")
            .trim_end_matches(".json");
        let snapshot = safe(root, &format!("formats/.history/{name}.{}.json", stamp()))?;
        atomic(&snapshot, Some(previous))?;
    }
    let body = serde_json::to_string(&r)?;
    atomic(&dest, Some(&body))?;
    atomic(&pending, Some(&body))?;
    finish(root, &r)?;
    Ok(r)
}
pub fn apply(root: &Path, p: Proposal) -> anyhow::Result<Record> {
    let _g = LOCK.lock().unwrap();
    let v = preview_inner(root, p)?;
    let p = v.proposal;
    let name = p
        .target
        .trim_start_matches("formats/")
        .trim_end_matches(".json");
    let id = format!("{name}-{}", stamp());
    transact(
        root,
        Record {
            id,
            target: p.target,
            process: p.process,
            before: p.before,
            after: Some(p.after),
            process_before: p.process_before,
            process_after: Some(v.process_after),
        },
    )
}
pub fn rollback(root: &Path, id: &str) -> anyhow::Result<Record> {
    let _g = LOCK.lock().unwrap();
    let r: Record = serde_json::from_str(
        &read_limit(&journal_path(root, id)?, LIMIT * 32)?.context("history missing")?,
    )?;
    paths(&r.target, &r.process)?;
    for text in [&r.before, &r.after].into_iter().flatten() {
        format_valid(text)?;
    }
    for text in [&r.process_before, &r.process_after].into_iter().flatten() {
        ensure!(text.len() <= LIMIT, "process too large");
    }

    ensure!(
        read(&safe(root, &r.target)?)? == r.after
            && read(&safe(root, &r.process)?)? == r.process_after,
        "stale rollback: files changed"
    );
    transact(
        root,
        Record {
            id: format!("rollback-{}", stamp()),
            target: r.target,
            process: r.process,
            before: r.after,
            after: r.before,
            process_before: r.process_after,
            process_after: r.process_before,
        },
    )
}
pub fn recover(root: &Path) -> anyhow::Result<()> {
    let _g = LOCK.lock().unwrap();
    history(root)?;
    if let Some(body) = read_limit(&safe(root, "formats/.history/pending.json")?, LIMIT * 32)? {
        let r: Record = serde_json::from_str(&body)?;
        finish(root, &r)?;
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> (tempfile::TempDir, Proposal) {
        let d = tempfile::tempdir().unwrap();
        fs::create_dir(d.path().join("formats")).unwrap();
        fs::create_dir_all(d.path().join("Learning/English/Reading")).unwrap();
        let before =
            r#"{"version":1,"steps":[{"id":"read","title":"Before","blocks":[]}]}"#.to_owned();
        let p = Proposal {
            target: "formats/english-reading.json".into(),
            before: Some(before.clone()),
            after: before.replace("Before", "After"),
            process: "Learning/English/Reading/process.md".into(),
            process_before: Some("Existing rules\n".into()),
            rule: "Number sentences".into(),
        };
        fs::write(d.path().join(&p.target), before).unwrap();
        fs::write(
            d.path().join(&p.process),
            p.process_before.as_ref().unwrap(),
        )
        .unwrap();
        (d, p)
    }
    #[test]
    fn apply_rollback_and_stale_checks() {
        let (d, p) = fixture();
        let r = apply(d.path(), p.clone()).unwrap();
        assert_eq!(list(d.path()).unwrap().len(), 1);
        assert_eq!(
            read(&d.path().join(&p.target)).unwrap(),
            Some(p.after.clone())
        );
        assert!(apply(d.path(), p.clone()).is_err());
        let undo = rollback(d.path(), &r.id).unwrap();
        assert_eq!(read(&d.path().join(&p.target)).unwrap(), p.before);
        assert_eq!(read(&d.path().join(&p.process)).unwrap(), p.process_before);
        rollback(d.path(), &undo.id).unwrap();
        fs::write(d.path().join(&p.process), "Concurrent edit").unwrap();
        assert!(rollback(d.path(), &r.id).is_err());
    }
    #[test]
    fn validates_paths_data_and_process_staleness() {
        let (d, p) = fixture();
        for target in [
            "../escape",
            "formats/other.json",
            "formats/../english-reading.json",
        ] {
            let mut bad = p.clone();
            bad.target = target.into();
            assert!(apply(d.path(), bad).is_err());
        }
        let mut bad = p.clone();
        bad.after = "{}".into();
        assert!(apply(d.path(), bad).is_err());
        fs::write(d.path().join(&p.process), "changed").unwrap();
        assert!(apply(d.path(), p).is_err());
    }
    #[test]
    fn recovery_completes_partial_transaction_and_retains_conflicts() {
        let (d, p) = fixture();
        let v = preview(d.path(), p.clone()).unwrap();
        let r = Record {
            id: "english-reading-test".into(),
            target: p.target.clone(),
            process: p.process.clone(),
            before: p.before.clone(),
            after: Some(p.after.clone()),
            process_before: p.process_before,
            process_after: Some(v.process_after),
        };
        history(d.path()).unwrap();
        atomic(
            &safe(d.path(), "formats/.history/pending.json").unwrap(),
            Some(&serde_json::to_string(&r).unwrap()),
        )
        .unwrap();
        fs::write(d.path().join(&p.target), "conflict").unwrap();
        assert!(recover(d.path()).is_err());
        assert!(d.path().join("formats/.history/pending.json").exists());
        fs::write(d.path().join(&p.target), p.after).unwrap();
        recover(d.path()).unwrap();
        assert_eq!(read(&d.path().join(&p.process)).unwrap(), r.process_after);
        assert!(!d.path().join("formats/.history/pending.json").exists());
    }
    #[test]
    fn creates_missing_files_and_updates_only_managed_section() {
        let (d, mut p) = fixture();
        fs::remove_file(d.path().join(&p.target)).unwrap();
        fs::remove_file(d.path().join(&p.process)).unwrap();
        p.before = None;
        p.process_before = None;
        let r = apply(d.path(), p.clone()).unwrap();
        let old = read(&d.path().join(&p.process)).unwrap().unwrap();
        p.before = Some(p.after.clone());
        p.process_before = Some(format!("prefix{old}suffix"));
        fs::write(
            d.path().join(&p.process),
            p.process_before.as_ref().unwrap(),
        )
        .unwrap();
        p.rule = "New rule".into();
        let v = preview(d.path(), p).unwrap();
        assert!(v.process_after.starts_with("prefix"));
        assert!(v.process_after.ends_with("suffix"));
        assert!(!v.process_after.contains("Number sentences"));
        assert!(rollback(d.path(), &r.id).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn rejects_symlink_targets_and_history() {
        let (d, p) = fixture();
        let out = tempfile::tempdir().unwrap();
        fs::remove_file(d.path().join(&p.target)).unwrap();
        std::os::unix::fs::symlink(out.path().join("outside"), d.path().join(&p.target)).unwrap();
        assert!(preview(d.path(), p).is_err());
        std::os::unix::fs::symlink(out.path(), d.path().join("formats/.history")).unwrap();
        assert!(recover(d.path()).is_err());
    }
}

pub fn list(root: &Path) -> anyhow::Result<Vec<Record>> {
    let _g = LOCK.lock().unwrap();
    let mut result = Vec::new();
    for entry in fs::read_dir(history(root)?)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name == "pending.json"
            || !name.ends_with(".json")
            || name.trim_end_matches(".json").contains('.')
        {
            continue;
        }
        let id = name.trim_end_matches(".json");
        let path = journal_path(root, id)?;
        let record: Record =
            serde_json::from_str(&read_limit(&path, LIMIT * 32)?.context("history missing")?)?;
        paths(&record.target, &record.process)?;
        result.push(record);
    }
    result.sort_by(|a, b| b.id.cmp(&a.id));
    Ok(result)
}
