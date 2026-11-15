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
    std::fs::write(path, updated)?;
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
