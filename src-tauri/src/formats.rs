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
    let formats = directory(vault, "formats")?;
    create_once(
        &formats.join("english-reading.json"),
        include_str!("../../formats/english-reading.json"),
    )?;
    let parent = directory(vault, ".mellorin")?;
    let readme = parent.join("README.md");
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
pub fn request(vault: &Path, date: &str, block: &str, format: &str) -> anyhow::Result<()> {
    ensure!(
        simple(block) && simple(format),
        "block and format must be simple lowercase names (max 64)"
    );
    ensure!(
        valid_date(date),
        "date must be a valid YYYY-MM-DD calendar date"
    );
    let parent = directory(vault, "app-requests")?;
    create_once(&parent.join(format!("{date}-{block}.md")), &format!("# Requested block: {block}\n\nFormat: formats/{format}.json\nDate: {date}\n\nThe format renderer needs this block type.\n"))
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
    fn fixed_seed_preserves_existing_format_and_instructions() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".mellorin")).unwrap();
        std::fs::write(
            dir.path().join(".mellorin/README.md"),
            "Keep my instructions",
        )
        .unwrap();
        seed(dir.path()).unwrap();
        std::fs::write(dir.path().join("formats/english-reading.json"), "custom").unwrap();
        seed(dir.path()).unwrap();
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
        request(dir.path(), "2026-11-15", "missing", "english-reading").unwrap();
        request(dir.path(), "2026-11-15", "missing", "other").unwrap();
        let note = vault::read_text(dir.path(), "app-requests/2026-11-15-missing.md").unwrap();
        assert!(note.contains("english-reading"));
        for (date, block) in [
            ("2026-02-30", "ok"),
            ("2026-11-15", "../escape"),
            ("2026-11-15", "a/b"),
        ] {
            assert!(request(dir.path(), date, block, "test").is_err());
        }
    }
    #[cfg(unix)]
    #[test]
    fn rejects_external_directories_and_readme() {
        let outside = tempfile::tempdir().unwrap();
        for name in ["formats", "app-requests", ".mellorin"] {
            let dir = tempfile::tempdir().unwrap();
            std::os::unix::fs::symlink(outside.path(), dir.path().join(name)).unwrap();
            assert!(if name == "app-requests" {
                request(dir.path(), "2026-11-15", "missing", "test")
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
