use std::io::Write;
use std::path::{Path, PathBuf};

const CANONICAL_VOCAB: &str = "Learning/English/vocabulary/mywords-list.md";
const LEGACY_VOCAB: &str = "vocabulary/mywords-list.md";
const TABLE_HEADER: [&str; 5] = [
    "Слово / фраза",
    "Перевод",
    "Источник",
    "Добавлено",
    "Статус",
];

#[derive(Debug, serde::Serialize)]
pub struct VocabularyEntry {
    pub word: String,
    pub translation: String,
    pub source: String,
    pub added: String,
    pub status: String,
    pub path: String,
}

struct Row {
    entry: VocabularyEntry,
    status: Option<std::ops::Range<usize>>,
    legacy_metadata: Vec<std::ops::Range<usize>>,
}

fn valid_word(word: &str) -> anyhow::Result<()> {
    anyhow::ensure!(
        !word.trim().is_empty()
            && word == word.trim()
            && !word.contains(['\n', '\r', '*', '<', '>']),
        "word must be a nonempty plain single line"
    );
    Ok(())
}

fn vocab_path(vault: &Path) -> anyhow::Result<(PathBuf, &'static str)> {
    let relative = if match vault.join(CANONICAL_VOCAB).symlink_metadata() {
        Ok(_) => true,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => false,
        Err(e) => return Err(e.into()),
    } {
        CANONICAL_VOCAB
    } else {
        LEGACY_VOCAB
    };
    let root = vault.canonicalize()?;
    let mut path = root.clone();
    for component in Path::new(relative).components() {
        path.push(component);
        match path.symlink_metadata() {
            Ok(_) => anyhow::ensure!(
                path.canonicalize()?.starts_with(&root),
                "vocabulary leaves vault"
            ),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(e) => return Err(e.into()),
        }
    }
    if path.try_exists()? {
        path = path.canonicalize()?;
    }
    Ok((path, relative))
}

// Byte ranges point into the original UTF-8 text, including CRLF and whitespace.
fn cells(line: &str) -> Option<Vec<std::ops::Range<usize>>> {
    let line = line.trim_end_matches(['\r', '\n']);
    if !line.starts_with('|') || !line.ends_with('|') {
        return None;
    }
    let mut pipes = Vec::new();
    let mut slashes = 0;
    for (i, ch) in line.char_indices() {
        if ch == '|' && slashes % 2 == 0 {
            pipes.push(i);
        }
        slashes = if ch == '\\' { slashes + 1 } else { 0 };
    }
    Some(
        pipes
            .windows(2)
            .map(|w| {
                let text = &line[w[0] + 1..w[1]];
                let start = w[0] + 1 + text.len() - text.trim_start().len();
                start..start + text.trim().len()
            })
            .collect(),
    )
}

fn parse_vocab(text: &str, path: &str) -> anyhow::Result<(Vec<Row>, Option<usize>)> {
    let mut rows = Vec::new();
    let mut metadata: std::collections::HashMap<String, Vec<(std::ops::Range<usize>, String)>> =
        std::collections::HashMap::new();
    let mut table_end = None;
    let mut in_table = false;
    let mut frontmatter = false;
    let mut comment = false;
    let mut fence: Option<&str> = None;
    let mut offset = 0;
    for (number, line) in text.split_inclusive('\n').enumerate() {
        let start = offset;
        offset += line.len();
        let trimmed = line.trim();
        if number == 0 && trimmed.trim_start_matches('\u{feff}') == "---" {
            frontmatter = true;
            continue;
        }
        if frontmatter {
            if trimmed == "---" {
                frontmatter = false;
            }
            continue;
        }
        if let Some(marker) = fence {
            if trimmed.starts_with(marker) {
                fence = None;
            }
            continue;
        }
        if comment {
            if trimmed.contains("-->") {
                comment = false;
            }
            continue;
        }
        if trimmed.starts_with("<!--") {
            if let Some((word, status)) = legacy_status(line.trim_end_matches(['\r', '\n'])) {
                metadata
                    .entry(word)
                    .or_default()
                    .push((start..offset, status.into()));
            }
            comment = !trimmed.contains("-->");
            continue;
        }
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            fence = Some(if trimmed.starts_with('`') {
                "```"
            } else {
                "~~~"
            });
            continue;
        }
        if let Some(ranges) = cells(line) {
            let values: Vec<&str> = ranges.iter().map(|r| &line[r.clone()]).collect();
            if values == TABLE_HEADER {
                anyhow::ensure!(
                    table_end.is_none(),
                    "multiple vocabulary tables are ambiguous"
                );
                in_table = true;
                table_end = Some(offset);
                continue;
            }
            if in_table {
                anyhow::ensure!(values.len() == 5, "vocabulary row must have five cells");
                if values
                    .iter()
                    .all(|v| !v.is_empty() && v.chars().all(|c| c == '-' || c == ':'))
                {
                    table_end = Some(offset);
                    continue;
                }
                anyhow::ensure!(
                    ["learning", "focus", "known"].contains(&values[4]),
                    "unsupported vocabulary row status"
                );
                rows.push(Row {
                    entry: VocabularyEntry {
                        word: unescape_cell(values[0]),
                        translation: unescape_cell(values[1]),
                        source: unescape_cell(values[2]),
                        added: values[3].into(),
                        status: values[4].into(),
                        path: path.into(),
                    },
                    status: Some(start + ranges[4].start..start + ranges[4].end),
                    legacy_metadata: Vec::new(),
                });
                table_end = Some(offset);
                continue;
            }
        }
        in_table = false;
        if let Some(rest) = line.strip_prefix("- **") {
            if let Some((word, sentence)) = rest.trim_end_matches(['\r', '\n']).split_once("** — ")
            {
                rows.push(Row {
                    entry: VocabularyEntry {
                        word: word.into(),
                        translation: String::new(),
                        source: sentence.into(),
                        added: String::new(),
                        status: "learning".into(),
                        path: path.into(),
                    },
                    status: None,
                    legacy_metadata: Vec::new(),
                });
            }
        }
    }
    for row in &mut rows {
        if row.status.is_none() {
            if let Some(entries) = metadata.get(&row.entry.word) {
                row.entry.status = entries.last().unwrap().1.clone();
                row.legacy_metadata = entries.iter().map(|(range, _)| range.clone()).collect();
            }
        }
    }
    anyhow::ensure!(
        path != CANONICAL_VOCAB || table_end.is_some(),
        "canonical vocabulary table header is missing"
    );
    anyhow::ensure!(rows.len() <= 10000, "vocabulary exceeds 10000 entries");
    Ok((rows, table_end))
}

pub fn vocab_list(vault: &Path) -> anyhow::Result<Vec<VocabularyEntry>> {
    let (path, relative) = vocab_path(vault)?;
    if !path.try_exists()? {
        return Ok(Vec::new());
    }
    let text = read_text(vault, relative)?;
    Ok(parse_vocab(&text, relative)?
        .0
        .into_iter()
        .map(|r| r.entry)
        .collect())
}

fn newline(text: &str) -> &'static str {
    if text.contains("\r\n") {
        "\r\n"
    } else {
        "\n"
    }
}

fn legacy_status(line: &str) -> Option<(String, &str)> {
    let (word, status) = line
        .strip_prefix("<!-- mellorin-status ")?
        .strip_suffix(" -->")?
        .rsplit_once(' ')?;
    if !["learning", "focus", "known"].contains(&status) {
        return None;
    }
    Some((serde_json::from_str(word).ok()?, status))
}

fn unescape_cell(text: &str) -> String {
    let mut result = String::new();
    let mut chars = text.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\\' && matches!(chars.peek(), Some('|' | '\\')) {
            result.push(chars.next().unwrap());
        } else {
            result.push(ch);
        }
    }
    result
}

fn escape_cell(text: &str) -> String {
    text.replace('\\', "\\\\").replace('|', "\\|")
}

// Gregorian civil date from UTC days since Unix epoch (no subprocess/model call).
fn added_date() -> String {
    let days = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        / 86400;
    date_from_days(days)
}

fn date_from_days(days: u64) -> String {
    let z = days as i64 + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let mut year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    format!("{day:02}.{month:02}.{year:04}")
}

pub fn vocab_add(vault: &Path, word: &str, sentence: &str) -> anyhow::Result<()> {
    valid_word(word)?;
    anyhow::ensure!(
        !sentence.contains(['\n', '\r']),
        "sentence must be a single line"
    );
    let (path, relative) = vocab_path(vault)?;
    let contents = if path.try_exists()? {
        read_text(vault, relative)?
    } else {
        String::new()
    };
    let (rows, table_end) = parse_vocab(&contents, relative)?;
    if rows.iter().any(|r| r.entry.word == word) {
        return vocab_set_status(vault, word, "learning");
    }
    anyhow::ensure!(rows.len() < 10000, "vocabulary exceeds 10000 entries");
    let nl = newline(&contents);
    let mut updated = contents.clone();
    if let Some(end) = table_end {
        let separator = if end > 0 && !contents[..end].ends_with('\n') {
            nl
        } else {
            ""
        };
        updated.insert_str(
            end,
            &format!(
                "{separator}| {} | | {} | {} | learning |{nl}",
                escape_cell(word),
                escape_cell(sentence),
                added_date()
            ),
        );
    } else {
        anyhow::ensure!(
            relative != CANONICAL_VOCAB,
            "canonical vocabulary table header is missing"
        );
        if !updated.is_empty() && !updated.ends_with('\n') {
            updated.push_str(nl);
        }
        updated.push_str(&format!("- **{word}** — {sentence}{nl}"));
    }
    anyhow::ensure!(
        updated.len() as u64 <= MAX_TEXT_BYTES,
        "text exceeds 2 MiB limit"
    );
    if path.try_exists()? {
        replace_file(&path, updated.as_bytes())?;
    } else {
        std::fs::create_dir_all(path.parent().unwrap())?;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)?;
        file.write_all(updated.as_bytes())?;
        file.sync_all()?;
    }
    Ok(())
}

pub fn vocab_set_status(vault: &Path, word: &str, status: &str) -> anyhow::Result<()> {
    valid_word(word)?;
    anyhow::ensure!(
        ["learning", "focus", "known"].contains(&status),
        "invalid vocabulary status: expected learning, focus or known"
    );
    let (path, relative) = vocab_path(vault)?;
    let contents = read_text(vault, relative)?;
    let (rows, _) = parse_vocab(&contents, relative)?;
    let matches: Vec<_> = rows.iter().filter(|r| r.entry.word == word).collect();
    anyhow::ensure!(
        !matches.is_empty(),
        "word is not in vocabulary; add it first"
    );
    anyhow::ensure!(
        matches.len() == 1,
        "duplicate vocabulary rows are ambiguous"
    );
    let row = matches[0];
    if row.entry.status == status {
        return Ok(());
    }
    let mut updated = contents.clone();
    if let Some(range) = &row.status {
        updated.replace_range(range.clone(), status);
    } else {
        let prefix = format!("<!-- mellorin-status {} ", serde_json::to_string(word)?);
        for range in row.legacy_metadata.iter().rev() {
            updated.replace_range(range.clone(), "");
        }
        if status != "learning" {
            let nl = newline(&contents);
            if !updated.ends_with('\n') {
                updated.push_str(nl);
            }
            updated.push_str(&format!("{prefix}{status} -->{nl}"));
        }
    }
    anyhow::ensure!(
        updated.len() as u64 <= MAX_TEXT_BYTES,
        "text exceeds 2 MiB limit"
    );
    replace_file(&path, updated.as_bytes())
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
pub(crate) fn replace_file(path: &Path, contents: &[u8]) -> anyhow::Result<()> {
    use std::sync::atomic::{AtomicU64, Ordering};
    static NEXT: AtomicU64 = AtomicU64::new(0);
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| anyhow::anyhow!("invalid file name"))?;
    let temp = path.with_file_name(format!(
        ".{name}.{}.{}.tmp",
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

#[cfg(test)]
mod vocabulary_compatibility_tests {
    use super::*;

    const FIXTURE: &str = "---\r\nkind: synthetic\r\ntags:\r\n  - fixture\r\n---\r\n# Synthetic vocabulary\r\n\r\n<!-- keep comment -->\r\nRules: learning / known / focus; preserve all metadata.\r\n| Слово / фраза | Перевод | Источник | Добавлено | Статус |\r\n|---|---|---|---|---|\r\n| sample / samples (noun) | образец; ~~ошибка~~ `code` | [[lesson]]; test ✓ | 02.01.2025 |  focus  |\r\n| phrase \\| option | тест | synthetic | 03.01.2025 | known |\r\n\r\n## Keep footer\r\nUnrelated bytes without final newline";

    fn fixture(text: &str) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(CANONICAL_VOCAB);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, text).unwrap();
        dir
    }

    #[test]
    fn utc_dates_match_existing_day_month_year_grammar() {
        assert_eq!(date_from_days(0), "01.01.1970");
        assert_eq!(date_from_days(19782), "29.02.2024");
        assert_eq!(date_from_days(20089), "01.01.2025");
    }

    #[test]
    fn legacy_status_does_not_remove_unrelated_or_example_comments() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join("vocabulary")).unwrap();
        let original = "- **sample** — context\n<!-- mellorin-status \"sample\" invalid -->\n```md\n<!-- mellorin-status \"sample\" known -->\n```\n";
        std::fs::write(dir.path().join(LEGACY_VOCAB), original).unwrap();
        vocab_set_status(dir.path(), "sample", "focus").unwrap();
        vocab_set_status(dir.path(), "sample", "learning").unwrap();
        assert_eq!(
            std::fs::read(dir.path().join(LEGACY_VOCAB)).unwrap(),
            original.as_bytes()
        );
    }

    #[test]
    fn canonical_status_changes_only_status_bytes() {
        let dir = fixture(FIXTURE);
        std::fs::create_dir(dir.path().join("vocabulary")).unwrap();
        std::fs::write(dir.path().join(LEGACY_VOCAB), "legacy untouched").unwrap();
        vocab_set_status(dir.path(), "sample / samples (noun)", "known").unwrap();
        assert_eq!(
            std::fs::read(dir.path().join(CANONICAL_VOCAB)).unwrap(),
            FIXTURE.replacen("  focus  ", "  known  ", 1).as_bytes()
        );
        assert_eq!(
            std::fs::read_to_string(dir.path().join(LEGACY_VOCAB)).unwrap(),
            "legacy untouched"
        );
        let entries = vocab_list(dir.path()).unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].added, "02.01.2025");
        assert_eq!(entries[0].source, "[[lesson]]; test ✓");
        assert_eq!(entries[0].translation, "образец; ~~ошибка~~ `code`");
        assert_eq!(entries[0].status, "known");
    }

    #[test]
    fn canonical_append_preserves_entire_prefix_and_suffix_and_escapes_pipes() {
        let dir = fixture(FIXTURE);
        vocab_add(dir.path(), "new | word", "source | context").unwrap();
        let inserted = format!(
            "| new \\| word | | source \\| context | {} | learning |\r\n",
            added_date()
        );
        let expected = FIXTURE.replace(
            "\r\n\r\n## Keep footer",
            &format!("\r\n{inserted}\r\n## Keep footer"),
        );
        assert_eq!(
            std::fs::read(dir.path().join(CANONICAL_VOCAB)).unwrap(),
            expected.as_bytes()
        );
        vocab_add(dir.path(), "new | word", "different ignored").unwrap();
        assert_eq!(
            std::fs::read(dir.path().join(CANONICAL_VOCAB)).unwrap(),
            expected.as_bytes()
        );
        vocab_set_status(dir.path(), "new | word", "focus").unwrap();
        assert_eq!(vocab_list(dir.path()).unwrap()[2].status, "focus");
        assert_eq!(vocab_list(dir.path()).unwrap()[2].word, "new | word");
    }

    #[test]
    fn append_at_eof_and_lf_status_preserve_bytes() {
        let text = FIXTURE.replace("\r\n", "\n");
        let text = text.split("\n\n## Keep footer").next().unwrap();
        let dir = fixture(text);
        vocab_add(dir.path(), "added", "context").unwrap();
        assert_eq!(
            std::fs::read_to_string(dir.path().join(CANONICAL_VOCAB)).unwrap(),
            format!(
                "{text}\n| added | | context | {} | learning |\n",
                added_date()
            )
        );
    }

    #[test]
    fn legacy_dedupe_and_metadata_preserve_crlf() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join("vocabulary")).unwrap();
        let original = "---\r\nfixture: true\r\n---\r\n# Keep\r\n- **sample** — context\r\n<!-- unrelated -->\r\n";
        std::fs::write(dir.path().join(LEGACY_VOCAB), original).unwrap();
        vocab_set_status(dir.path(), "sample", "focus").unwrap();
        assert_eq!(
            std::fs::read_to_string(dir.path().join(LEGACY_VOCAB)).unwrap(),
            format!("{original}<!-- mellorin-status \"sample\" focus -->\r\n")
        );
        assert_eq!(vocab_list(dir.path()).unwrap()[0].status, "focus");
        vocab_add(dir.path(), "sample", "ignored").unwrap();
        assert_eq!(
            std::fs::read(dir.path().join(LEGACY_VOCAB)).unwrap(),
            original.as_bytes()
        );
    }

    #[test]
    fn frontmatter_comments_and_fenced_examples_are_not_words() {
        let dir = fixture(&format!("---\n- **hidden** — frontmatter\n---\n<!--\n- **hidden** — comment\n-->\n```md\n- **hidden** — fence\n```\n{FIXTURE}"));
        assert!(vocab_set_status(dir.path(), "hidden", "known").is_err());
        assert_eq!(vocab_list(dir.path()).unwrap().len(), 2);
    }

    #[test]
    fn invalid_or_ambiguous_table_is_never_modified() {
        for text in [
            FIXTURE.replace("  focus  ", " invalid "),
            FIXTURE.replace("  focus  ", " known | extra "),
            format!("{FIXTURE}\n{}", FIXTURE),
            "# No table".into(),
        ] {
            let dir = fixture(&text);
            assert!(vocab_add(dir.path(), "new", "source").is_err());
            assert_eq!(
                std::fs::read(dir.path().join(CANONICAL_VOCAB)).unwrap(),
                text.as_bytes()
            );
        }
        let dir = fixture(&FIXTURE.replace("phrase \\| option", "sample / samples (noun)"));
        assert!(vocab_set_status(dir.path(), "sample / samples (noun)", "known").is_err());
    }

    #[test]
    fn vocabulary_operations_preserve_service_files_and_bound_entry_count() {
        let dir = fixture(FIXTURE);
        let services = [
            "CLAUDE.md",
            "Learning/English/CLAUDE.md",
            ".claude/settings.json",
            ".obsidian/app.json",
            "JERY/rules.md",
            "Templates/note.md",
            ".git/config",
            ".mellorin/state.json",
            "formats/english-reading.json",
        ];
        for path in services {
            let path = dir.path().join(path);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, b"synthetic service bytes\r\n").unwrap();
        }
        vocab_add(dir.path(), "added", "synthetic source").unwrap();
        vocab_set_status(dir.path(), "added", "known").unwrap();
        vocab_list(dir.path()).unwrap();
        for path in services {
            assert_eq!(
                std::fs::read(dir.path().join(path)).unwrap(),
                b"synthetic service bytes\r\n"
            );
        }
        let legacy = tempfile::tempdir().unwrap();
        std::fs::create_dir(legacy.path().join("vocabulary")).unwrap();
        std::fs::write(
            legacy.path().join(LEGACY_VOCAB),
            "- **synthetic** — context\n".repeat(10001),
        )
        .unwrap();
        assert!(vocab_list(legacy.path()).is_err());
    }

    #[test]
    fn size_limit_and_invalid_input_do_not_write() {
        let dir = fixture(FIXTURE);
        assert!(vocab_add(dir.path(), "bad\nword", "context").is_err());
        assert!(vocab_add(dir.path(), "word", "bad\rcontext").is_err());
        assert!(vocab_set_status(dir.path(), "phrase", "invalid").is_err());
        assert_eq!(
            std::fs::read(dir.path().join(CANONICAL_VOCAB)).unwrap(),
            FIXTURE.as_bytes()
        );
        std::fs::write(
            dir.path().join(CANONICAL_VOCAB),
            vec![b'a'; MAX_TEXT_BYTES as usize + 1],
        )
        .unwrap();
        assert!(vocab_list(dir.path()).is_err());
        assert!(vocab_add(dir.path(), "new", "source").is_err());
    }

    #[cfg(unix)]
    #[test]
    fn internal_file_link_is_preserved_and_dangling_canonical_never_falls_back() {
        let dir = fixture(FIXTURE);
        let canonical = dir.path().join(CANONICAL_VOCAB);
        let target = dir.path().join("synthetic.md");
        std::fs::rename(&canonical, &target).unwrap();
        std::os::unix::fs::symlink(&target, &canonical).unwrap();
        vocab_set_status(dir.path(), "phrase | option", "learning").unwrap();
        assert!(canonical
            .symlink_metadata()
            .unwrap()
            .file_type()
            .is_symlink());
        assert_eq!(
            std::fs::read_to_string(&target).unwrap(),
            FIXTURE.replace("| known |", "| learning |")
        );
        std::fs::remove_file(target).unwrap();
        assert!(vocab_add(dir.path(), "new", "source").is_err());
        assert!(!dir.path().join(LEGACY_VOCAB).exists());
    }

    #[cfg(unix)]
    #[test]
    fn vocab_writes_reject_external_directory_and_file_links() {
        for file_link in [false, true] {
            let dir = tempfile::tempdir().unwrap();
            let outside = tempfile::tempdir().unwrap();
            let external = outside.path().join("mywords-list.md");
            std::fs::write(&external, "- **sample** — context\n").unwrap();
            if file_link {
                std::fs::create_dir(dir.path().join("vocabulary")).unwrap();
                std::os::unix::fs::symlink(&external, dir.path().join(LEGACY_VOCAB)).unwrap();
            } else {
                std::os::unix::fs::symlink(outside.path(), dir.path().join("vocabulary")).unwrap();
            }
            assert!(vocab_add(dir.path(), "new", "source").is_err());
            assert!(vocab_set_status(dir.path(), "sample", "known").is_err());
            assert!(vocab_list(dir.path()).is_err());
            assert_eq!(
                std::fs::read_to_string(external).unwrap(),
                "- **sample** — context\n"
            );
        }
    }
}
