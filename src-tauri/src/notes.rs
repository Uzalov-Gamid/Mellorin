//! Read-only study catalog. No note contents or filesystem errors enter diagnostics.
use anyhow::{ensure, Context, Result};
use serde::Serialize;
use std::{
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
};

const MAX_ENTRIES: usize = 10_000;
const MAX_NOTES: usize = 1_000;
const MAX_TOTAL: usize = 16 * 1024 * 1024;
pub const MAX_NOTE: usize = 2 * 1024 * 1024;

#[derive(Serialize)]
pub struct Note {
    pub path: String,
    pub markdown: String,
}
#[derive(Serialize)]
pub struct Catalog {
    pub notes: Vec<Note>,
    pub files: Vec<String>,
}

pub fn study_path(relative: &str) -> bool {
    !relative.is_empty()
        && Path::new(relative).components().all(|part| match part {
            Component::Normal(name) => {
                let name = name.to_string_lossy().to_lowercase();
                !name.starts_with('.')
                    && !matches!(
                        name.as_str(),
                        "claude.md" | "jery" | "templates" | "formats" | "_archive"
                    )
            }
            _ => false,
        })
        && !relative.contains('\\')
}

pub fn resolve(vault: &Path, relative: &str) -> Result<PathBuf> {
    ensure!(study_path(relative), "Недоступный путь заметки");
    let root = vault.canonicalize().context("Хранилище недоступно")?;
    let mut path = root.clone();
    // Reject symlinks at every component, including aliases into service directories.
    for part in Path::new(relative).components() {
        path.push(part);
        let meta = fs::symlink_metadata(&path).context("Файл недоступен")?;
        ensure!(
            !meta.file_type().is_symlink(),
            "Символические ссылки недоступны"
        );
    }
    let path = path.canonicalize().context("Файл недоступен")?;
    ensure!(path.starts_with(root), "Путь вне хранилища");
    Ok(path)
}

pub fn bounded(path: &Path, limit: usize) -> Result<Vec<u8>> {
    let file = fs::File::open(path).context("Файл недоступен")?;
    let metadata = file.metadata().context("Файл недоступен")?;
    ensure!(
        metadata.is_file() && metadata.len() <= limit as u64,
        "Файл превышает лимит или не является обычным файлом"
    );
    let mut bytes = Vec::new();
    file.take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .context("Не удалось прочитать файл")?;
    ensure!(bytes.len() <= limit, "Файл превышает лимит");
    Ok(bytes)
}

pub fn catalog(vault: &Path) -> Result<Catalog> {
    let root = vault.canonicalize().context("Хранилище недоступно")?;
    let mut result = Catalog {
        notes: vec![],
        files: vec![],
    };
    let mut stack = vec![(root.clone(), 0)];
    let (mut count, mut total) = (0, 0);
    while let Some((dir, depth)) = stack.pop() {
        ensure!(depth <= 32, "Превышена глубина каталогов");
        for entry in fs::read_dir(dir).context("Не удалось прочитать каталог")?
        {
            count += 1;
            ensure!(count <= MAX_ENTRIES, "Превышен лимит файлов");
            let entry = entry.context("Не удалось прочитать каталог")?;
            let path = entry.path();
            let relative = path
                .strip_prefix(&root)
                .context("Путь вне хранилища")?
                .to_str()
                .context("Неподдерживаемое имя файла")?
                .replace('\\', "/");
            if !study_path(&relative) {
                continue;
            }
            let kind = entry.file_type().context("Файл недоступен")?;
            if kind.is_symlink() {
                continue;
            }
            if kind.is_dir() {
                stack.push((path, depth + 1));
            } else if kind.is_file() {
                result.files.push(relative.clone());
                if path
                    .extension()
                    .is_some_and(|ext| ext.eq_ignore_ascii_case("md"))
                {
                    ensure!(result.notes.len() < MAX_NOTES, "Превышен лимит заметок");
                    let bytes = bounded(&resolve(&root, &relative)?, MAX_NOTE)?;
                    total += bytes.len();
                    ensure!(total <= MAX_TOTAL, "Превышен общий лимит заметок");
                    let markdown =
                        String::from_utf8(bytes).context("Заметка должна быть в UTF-8")?;
                    result.notes.push(Note {
                        path: relative,
                        markdown,
                    });
                }
            }
        }
    }
    result.notes.sort_by(|a, b| a.path.cmp(&b.path));
    result.files.sort();
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn excludes_services_but_keeps_study_documents() {
        let dir = tempfile::tempdir().unwrap();
        for path in [
            "CLAUDE.md",
            "Learning/English/CLAUDE.md",
            ".claude/rules.md",
            ".obsidian/x.md",
            "JERY/x.md",
            "Templates/x.md",
            ".git/x.md",
            ".mellorin/x.md",
            "formats/x.md",
            "Learning/English/process.md",
            "Learning/English/plan.md",
            "Learning/English/README.md",
            "Learning/English/errors.md",
            "Learning/English/progress.md",
            "Learning/English/session.md",
        ] {
            let file = dir.path().join(path);
            fs::create_dir_all(file.parent().unwrap()).unwrap();
            fs::write(file, "# Synthetic").unwrap();
        }
        let result = catalog(dir.path()).unwrap();
        assert_eq!(result.notes.len(), 6);
        assert!(result.notes.iter().all(|note| study_path(&note.path)));
        assert!(resolve(dir.path(), "../outside.md").is_err());
        assert!(resolve(dir.path(), "/outside.md").is_err());
        assert!(resolve(dir.path(), "Learning/English/CLAUDE.md").is_err());
    }
    #[cfg(unix)]
    #[test]
    fn rejects_external_and_service_alias_symlinks() {
        let dir = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("secret.md"), "synthetic").unwrap();
        fs::create_dir(dir.path().join("JERY")).unwrap();
        fs::write(dir.path().join("JERY/a.md"), "synthetic").unwrap();
        std::os::unix::fs::symlink(outside.path(), dir.path().join("escape")).unwrap();
        std::os::unix::fs::symlink(dir.path().join("JERY"), dir.path().join("alias")).unwrap();
        assert!(resolve(dir.path(), "escape/secret.md").is_err());
        assert!(resolve(dir.path(), "alias/a.md").is_err());
        assert!(catalog(dir.path()).unwrap().notes.is_empty());
    }
    #[test]
    fn bounded_notes_and_invalid_utf8() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("large.md");
        fs::write(&file, vec![b'x'; MAX_NOTE + 1]).unwrap();
        assert!(catalog(dir.path()).is_err());
        fs::write(file, [0xff]).unwrap();
        assert!(catalog(dir.path()).is_err());
    }
}

#[cfg(test)]
mod read_only_validation {
    #[test]
    #[ignore = "explicit read-only copy validation; never a CI fixture"]
    fn copy_catalog_read_only() {
        let path =
            std::env::var_os("MELLORIN_NOTES_READ_ONLY_COPY").expect("explicit copy path required");
        let result = super::catalog(std::path::Path::new(&path));
        assert!(result.is_ok(), "copy catalog must be safely readable");
        assert!(
            !result.unwrap().notes.is_empty(),
            "copy must contain study notes"
        );
    }
}
