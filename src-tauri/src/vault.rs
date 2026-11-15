use std::io::Write;
use std::path::Path;

pub fn vocab_add(vault: &Path, word: &str, sentence: &str) -> anyhow::Result<()> {
    anyhow::ensure!(
        !word.trim().is_empty() && !word.contains(['\n', '\r', '*', '<', '>']),
        "word must be a nonempty single line"
    );
    anyhow::ensure!(
        !sentence.contains(['\n', '\r']),
        "sentence must be a single line"
    );
    let dir = vault.join("vocabulary");
    std::fs::create_dir_all(&dir)?;
    let path = dir.join("mywords-list.md");
    let contents = match std::fs::read_to_string(&path) {
        Ok(contents) => contents,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(err) => return Err(err.into()),
    };
    let prefix = format!("- **{word}** — ");
    if contents.lines().any(|line| line.starts_with(&prefix)) {
        return vocab_set_status(vault, word, "learning");
    }
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    if !contents.is_empty() && !contents.ends_with('\n') {
        writeln!(file)?;
    }
    writeln!(file, "{prefix}{sentence}")?;
    Ok(())
}

// Legacy entries without metadata mean learning. Metadata never changes the entry line.
pub fn vocab_set_status(vault: &Path, word: &str, status: &str) -> anyhow::Result<()> {
    anyhow::ensure!(
        !word.trim().is_empty() && !word.contains(['\n', '\r', '*', '<', '>']),
        "word must be a nonempty plain single line"
    );
    anyhow::ensure!(
        ["learning", "focus", "known"].contains(&status),
        "invalid vocabulary status: expected learning, focus or known"
    );
    let path = vault.join("vocabulary/mywords-list.md");
    let contents = std::fs::read_to_string(&path)?;
    anyhow::ensure!(
        contents
            .lines()
            .any(|line| line.starts_with(&format!("- **{word}** — "))),
        "word is not in vocabulary; add it first"
    );
    let prefix = format!("<!-- mellorin-status {} ", serde_json::to_string(word)?);
    let mut updated = String::new();
    for line in contents.split_inclusive('\n') {
        if !line.starts_with(&prefix) {
            updated.push_str(line);
        }
    }
    if status != "learning" {
        if !updated.ends_with('\n') {
            updated.push('\n');
        }
        updated.push_str(&format!("{prefix}{status} -->\n"));
    }
    replace_file(&path, updated.as_bytes())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_vocabulary_and_deduplicates_exact_words() {
        let dir = tempfile::tempdir().unwrap();
        vocab_add(dir.path(), "word", "first").unwrap();
        vocab_add(dir.path(), "word", "second").unwrap();
        vocab_add(dir.path(), "Word", "case matters").unwrap();
        assert_eq!(
            std::fs::read_to_string(dir.path().join("vocabulary/mywords-list.md")).unwrap(),
            "- **word** — first\n- **Word** — case matters\n"
        );
    }
}

#[derive(Debug, serde::Serialize)]
pub struct VaultSubject {
    pub name: String,
    pub skills: Vec<String>,
}

pub fn subjects(vault: &Path) -> anyhow::Result<Vec<VaultSubject>> {
    let root = vault.canonicalize()?;
    let learning = root.join("Learning");
    if !learning.exists() {
        return Ok(Vec::new());
    }
    anyhow::ensure!(
        learning.canonicalize()?.starts_with(&root),
        "Learning leaves vault"
    );
    fn directories(path: &Path) -> anyhow::Result<Vec<String>> {
        let mut names = Vec::new();
        for entry in std::fs::read_dir(path)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let name = entry.file_name().to_string_lossy().into_owned();
                if !name.starts_with('.') {
                    names.push(name);
                }
            }
        }
        names.sort();
        Ok(names)
    }
    directories(&learning)?
        .into_iter()
        .map(|name| {
            let skills = directories(&learning.join(&name))?;
            Ok(VaultSubject { name, skills })
        })
        .collect()
}

#[cfg(test)]
mod subject_tests {
    use super::*;
    #[test]
    fn discovers_subjects_and_skills_without_following_links() {
        let vault = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(vault.path().join("Learning/English/reading")).unwrap();
        std::fs::create_dir_all(vault.path().join("Learning/.hidden")).unwrap();
        std::fs::write(vault.path().join("Learning/English/README.md"), "demo").unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink("/tmp", vault.path().join("Learning/External")).unwrap();
        let found = subjects(vault.path()).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].name, "English");
        assert_eq!(found[0].skills, ["reading"]);
    }
    #[test]
    fn missing_learning_is_empty() {
        assert!(subjects(tempfile::tempdir().unwrap().path())
            .unwrap()
            .is_empty());
    }
}

// Write beside the original and rename only after the complete replacement is durable.
fn replace_file(path: &Path, contents: &[u8]) -> anyhow::Result<()> {
    use std::sync::atomic::{AtomicU64, Ordering};
    static NEXT: AtomicU64 = AtomicU64::new(0);
    let temp = path.with_file_name(format!(
        ".mywords-list.{}.{}.tmp",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp)?;
    let result = (|| -> anyhow::Result<()> {
        file.set_permissions(std::fs::metadata(path)?.permissions())?;
        file.write_all(contents)?;
        file.sync_all()?;
        std::fs::rename(&temp, path)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
    }
    result
}

pub const MAX_TEXT_BYTES: u64 = 2 * 1024 * 1024;

pub fn resolve_inside(vault: &Path, relative: &str) -> anyhow::Result<std::path::PathBuf> {
    use std::path::Component;
    let path = Path::new(relative);
    anyhow::ensure!(
        path.components()
            .all(|part| matches!(part, Component::Normal(_))),
        "path must be relative without traversal"
    );
    let root = vault.canonicalize()?;
    let resolved = root.join(path).canonicalize()?;
    anyhow::ensure!(resolved.starts_with(&root), "path leaves vault");
    Ok(resolved)
}

pub fn read_text(vault: &Path, relative: &str) -> anyhow::Result<String> {
    use std::io::Read;
    let path = resolve_inside(vault, relative)?;
    anyhow::ensure!(std::fs::metadata(&path)?.is_file(), "not a regular file");
    let file = std::fs::File::open(path)?;
    anyhow::ensure!(
        file.metadata()?.len() <= MAX_TEXT_BYTES,
        "text exceeds 2 MiB limit"
    );
    let mut bytes = Vec::new();
    file.take(MAX_TEXT_BYTES + 1).read_to_end(&mut bytes)?;
    anyhow::ensure!(
        bytes.len() as u64 <= MAX_TEXT_BYTES,
        "text exceeds 2 MiB limit"
    );
    Ok(String::from_utf8(bytes)?)
}

#[derive(Debug, serde::Serialize)]
pub struct VaultEntry {
    pub name: String,
    pub is_dir: bool,
}

pub fn list(vault: &Path, relative: &str) -> anyhow::Result<Vec<VaultEntry>> {
    let root = vault.canonicalize()?;
    let directory = resolve_inside(vault, relative)?;
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(directory)? {
        let entry = entry?;
        let canonical = entry.path().canonicalize()?;
        anyhow::ensure!(
            canonical.starts_with(&root),
            "directory contains link leaving vault"
        );
        entries.push(VaultEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            is_dir: canonical.is_dir(),
        });
        anyhow::ensure!(entries.len() <= 10000, "directory exceeds 10000 entries");
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

#[cfg(test)]
mod read_tests {
    use super::*;
    #[test]
    fn bounded_reads_and_lists_reject_traversal() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("demo.md"), "synthetic").unwrap();
        assert_eq!(read_text(dir.path(), "demo.md").unwrap(), "synthetic");
        assert_eq!(list(dir.path(), "").unwrap()[0].name, "demo.md");
        for path in ["../demo.md", "/tmp/demo.md", "a/../demo.md", "./demo.md"] {
            assert!(read_text(dir.path(), path).is_err());
        }
        std::fs::write(
            dir.path().join("large"),
            vec![b'a'; MAX_TEXT_BYTES as usize + 1],
        )
        .unwrap();
        assert!(read_text(dir.path(), "large").is_err());
    }
    #[cfg(unix)]
    #[test]
    fn external_symlinks_are_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        std::fs::write(outside.path().join("private"), "synthetic outside").unwrap();
        std::os::unix::fs::symlink(outside.path(), dir.path().join("link")).unwrap();
        assert!(read_text(dir.path(), "link/private").is_err());
        assert!(list(dir.path(), "link").is_err());
        assert!(list(dir.path(), "").is_err());
    }
}
