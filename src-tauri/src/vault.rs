use std::io::Write;
use std::path::Path;

pub fn vocab_add(vault: &Path, word: &str, sentence: &str) -> anyhow::Result<()> {
    anyhow::ensure!(
        !word.is_empty() && !word.contains(['\n', '\r']),
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
        return Ok(());
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
