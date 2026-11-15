use crate::vault;
use anyhow::ensure;
use std::{
    io::Write,
    path::{Path, PathBuf},
};

fn simple(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value.as_bytes()[0].is_ascii_lowercase()
        && value
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}
fn directory(vault: &Path, name: &str) -> anyhow::Result<PathBuf> {
    let root = vault.canonicalize()?;
    let path = root.join(name);
    if !path.exists() {
        std::fs::create_dir(&path)?;
    }
    let path = vault::resolve_inside(&root, name)?;
    ensure!(path.is_dir(), "expected inside-vault directory");
    Ok(path)
}
fn create_once(path: &Path, body: &str) -> anyhow::Result<()> {
    match std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
    {
        Ok(mut file) => {
            file.write_all(body.as_bytes())?;
            file.sync_all()?;
            Ok(())
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => Ok(()),
        Err(error) => Err(error.into()),
    }
}
pub fn seed(vault: &Path) -> anyhow::Result<()> {
    // Both mounted format screens can request the fixed defaults simultaneously.
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = LOCK
        .lock()
        .map_err(|_| anyhow::anyhow!("format seed lock poisoned"))?;
    let formats = directory(vault, "formats")?;
    create_once(
        &formats.join("english-reading.json"),
        include_str!("../../formats/english-reading.json"),
    )?;
    create_once(
        &formats.join("english-words.json"),
        include_str!("../../formats/english-words.json"),
    )?;
    create_once(
        &formats.join("english-listening.json"),
        include_str!("../../formats/english-listening.json"),
    )?;
    create_once(
        &formats.join("english-writing.json"),
        include_str!("../../formats/english-writing.json"),
    )?;
    create_once(
        &formats.join("english-grammar.json"),
        include_str!("../../formats/english-grammar.json"),
    )?;
    let parent = directory(vault, ".mellorin")?;
    let readme = parent.join("README.md");
    // Writing's app-only contract migrates independently of the older format marker.
    create_once(&readme, "")?;
    let writing_old = vault::read_text(vault, ".mellorin/README.md")?;
    if !writing_old.contains("# English Writing v1") {
        let target = vault::resolve_inside(vault, ".mellorin/README.md")?;
        let mut file = std::fs::OpenOptions::new().append(true).open(target)?;
        write!(
            file,
            "\n\n{}",
            include_str!("../../docs/english-writing.md")
        )?;
        file.sync_all()?;
    }
    let grammar_old = vault::read_text(vault, ".mellorin/README.md")?;
    if !grammar_old.contains("# English Grammar v1") {
        let target = vault::resolve_inside(vault, ".mellorin/README.md")?;
        let mut file = std::fs::OpenOptions::new().append(true).open(target)?;
        write!(
            file,
            "\n\n{}",
            include_str!("../../docs/english-grammar.md")
        )?;
        file.sync_all()?;
    }
    const MARKER: &str = "# Mellorin format v1";
    let exists = readme.symlink_metadata().is_ok();
    if exists {
        let old = vault::read_text(vault, ".mellorin/README.md")?;
        if old.contains(MARKER) {
            return Ok(());
        }
        // Resolve an existing README too; never append through an external link.
        let target = vault::resolve_inside(vault, ".mellorin/README.md")?;
        let mut file = std::fs::OpenOptions::new().append(true).open(target)?;
        write!(file, "\n\n{}", include_str!("../../docs/formats.md"))?;
        file.sync_all()?;
    } else {
        create_once(&readme, include_str!("../../docs/formats.md"))?;
    }
    Ok(())
}
pub fn request(
    vault: &Path,
    date: &str,
    block: &str,
    format: &str,
    example: Option<&str>,
) -> anyhow::Result<()> {
    ensure!(
        simple(block) && simple(format),
        "block and format must be simple lowercase names (max 64)"
    );
    ensure!(
        valid_date(date),
        "date must be a valid YYYY-MM-DD calendar date"
    );
    let example = example.unwrap_or("No example supplied");
    ensure!(example.len() <= 262144, "request example exceeds 256 KiB");
    let excerpt: String = example.chars().take(12000).collect();
    let example = if excerpt.len() < example.len() {
        format!("{excerpt}\n[Example truncated; full block is in formats/{format}.json]")
    } else {
        excerpt
    };
    let parent = directory(vault, "app-requests")?;
    create_once(&parent.join(format!("{date}-{block}.md")), &format!("# Requested block: {block}\n\nFormat: formats/{format}.json\nDate: {date}\n\nStatus: open\n\nThe format renderer needs this block type.\n\nExample (data only):\n{example}\n"))
}
fn valid_date(date: &str) -> bool {
    let b = date.as_bytes();
    if b.len() != 10
        || b[4] != b'-'
        || b[7] != b'-'
        || b.iter()
            .enumerate()
            .any(|(i, c)| i != 4 && i != 7 && !c.is_ascii_digit())
    {
        return false;
    }
    let year: u32 = date[..4].parse().unwrap_or(0);
    let month: usize = date[5..7].parse().unwrap_or(0);
    let day: u32 = date[8..].parse().unwrap_or(0);
    let leap = year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400));
    let days = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    year > 0 && (1..=12).contains(&month) && day > 0 && day <= days[month - 1]
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn grammar_seed_migrates_once_and_preserves_process_and_custom_format() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join(".mellorin")).unwrap();
        std::fs::create_dir_all(dir.path().join("Learning/English/grammar")).unwrap();
        let process = dir.path().join("Learning/English/grammar/process.md");
        std::fs::write(&process, "Synthetic process: exact bytes.\n").unwrap();
        std::fs::write(
            dir.path().join(".mellorin/README.md"),
            "Existing\n# Mellorin format v1",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        assert!(vault::read_text(dir.path(), "formats/english-grammar.json")
            .unwrap()
            .contains("grammar-study"));
        std::fs::write(
            dir.path().join("formats/english-grammar.json"),
            "custom grammar",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        let readme = vault::read_text(dir.path(), ".mellorin/README.md").unwrap();
        assert!(readme.starts_with("Existing\n# Mellorin format v1"));
        assert_eq!(readme.matches("# English Grammar v1").count(), 1);
        assert_eq!(
            std::fs::read_to_string(process).unwrap(),
            "Synthetic process: exact bytes.\n"
        );
        assert_eq!(
            vault::read_text(dir.path(), "formats/english-grammar.json").unwrap(),
            "custom grammar"
        );
    }

    #[test]
    fn writing_seed_migrates_contract_without_touching_process_or_custom_format() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join(".mellorin")).unwrap();
        std::fs::create_dir_all(dir.path().join("Learning/English/writing")).unwrap();
        let process = dir.path().join("Learning/English/writing/process.md");
        std::fs::write(&process, "Synthetic process: keep exact bytes.\n").unwrap();
        std::fs::write(
            dir.path().join(".mellorin/README.md"),
            "Existing instructions\n# Mellorin format v1",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        assert!(vault::read_text(dir.path(), "formats/english-writing.json")
            .unwrap()
            .contains("writing-study"));
        std::fs::write(
            dir.path().join("formats/english-writing.json"),
            "custom writing",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        let readme = vault::read_text(dir.path(), ".mellorin/README.md").unwrap();
        assert!(readme.starts_with("Existing instructions\n# Mellorin format v1"));
        assert_eq!(readme.matches("# English Writing v1").count(), 1);
        assert_eq!(
            std::fs::read_to_string(process).unwrap(),
            "Synthetic process: keep exact bytes.\n"
        );
        assert_eq!(
            vault::read_text(dir.path(), "formats/english-writing.json").unwrap(),
            "custom writing"
        );
    }

    #[test]
    fn fixed_seed_preserves_existing_format_and_instructions() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".mellorin")).unwrap();
        std::fs::write(
            dir.path().join(".mellorin/README.md"),
            "Keep my instructions",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        assert!(
            vault::read_text(dir.path(), "formats/english-listening.json")
                .unwrap()
                .contains("listening-lesson")
        );
        std::fs::write(
            dir.path().join("formats/english-listening.json"),
            "custom listening",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        assert_eq!(
            vault::read_text(dir.path(), "formats/english-listening.json").unwrap(),
            "custom listening"
        );
        assert!(vault::read_text(dir.path(), "formats/english-words.json")
            .unwrap()
            .contains("word-study"));
        std::fs::write(dir.path().join("formats/english-reading.json"), "custom").unwrap();
        std::fs::write(
            dir.path().join("formats/english-words.json"),
            "custom words",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        assert_eq!(
            vault::read_text(dir.path(), "formats/english-words.json").unwrap(),
            "custom words"
        );
        assert_eq!(
            vault::read_text(dir.path(), "formats/english-reading.json").unwrap(),
            "custom"
        );
        let readme = vault::read_text(dir.path(), ".mellorin/README.md").unwrap();
        assert!(readme.starts_with("Keep my instructions"));
        assert_eq!(readme.matches("# Mellorin format v1").count(), 1);
    }
    #[test]
    fn requests_are_validated_and_deduplicated() {
        let dir = tempfile::tempdir().unwrap();
        request(
            dir.path(),
            "2026-11-15",
            "missing",
            "english-reading",
            Some("synthetic example"),
        )
        .unwrap();
        request(dir.path(), "2026-11-15", "missing", "other", None).unwrap();
        let note = vault::read_text(dir.path(), "app-requests/2026-11-15-missing.md").unwrap();
        assert!(note.contains("english-reading"));
        assert!(note.contains("synthetic example"));
        assert!(note.contains("Status: open"));
        for (date, block) in [
            ("2026-02-30", "ok"),
            ("2026-11-15", "../escape"),
            ("2026-11-15", "a/b"),
        ] {
            assert!(request(dir.path(), date, block, "test", None).is_err());
        }
    }
    #[test]
    fn large_unicode_request_example_remains_readable_in_inbox() {
        let dir = tempfile::tempdir().unwrap();
        request(
            dir.path(),
            "2026-11-15",
            "missing",
            "english-reading",
            Some(&"文".repeat(30000)),
        )
        .unwrap();
        let notes = crate::requests::snapshot(dir.path()).unwrap();
        assert_eq!(notes.open.len(), 1);
        assert!(notes.open[0].body.contains("Example truncated"));
        assert!(notes.open[0].body.len() < 65536);
    }
    #[cfg(unix)]
    #[test]
    fn rejects_external_directories_and_readme() {
        let outside = tempfile::tempdir().unwrap();
        for name in ["formats", "app-requests", ".mellorin"] {
            let dir = tempfile::tempdir().unwrap();
            std::os::unix::fs::symlink(outside.path(), dir.path().join(name)).unwrap();
            assert!(if name == "app-requests" {
                request(dir.path(), "2026-11-15", "missing", "test", None)
            } else {
                seed(dir.path())
            }
            .is_err());
        }
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".mellorin")).unwrap();
        std::fs::write(outside.path().join("README.md"), "private synthetic").unwrap();
        std::os::unix::fs::symlink(
            outside.path().join("README.md"),
            dir.path().join(".mellorin/README.md"),
        )
        .unwrap();
        assert!(seed(dir.path()).is_err());
    }
}
