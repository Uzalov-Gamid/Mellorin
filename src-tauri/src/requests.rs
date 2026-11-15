use crate::vault;
use anyhow::ensure;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct Request {
    pub name: String,
    pub body: String,
}
#[derive(Debug, Serialize)]
pub struct Snapshot {
    pub open: Vec<Request>,
}

pub fn snapshot(root: &Path) -> anyhow::Result<Snapshot> {
    match std::fs::symlink_metadata(root.join("app-requests")) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Snapshot { open: vec![] })
        }
        Err(error) => return Err(error.into()),
        Ok(_) => {}
    }
    let entries = vault::list(root, "app-requests")?;
    let notes: Vec<_> = entries
        .into_iter()
        .filter(|e| !e.is_dir && e.name.ends_with(".md"))
        .collect();
    ensure!(notes.len() <= 200, "request inbox exceeds 200 notes");
    let mut open = Vec::new();
    for note in notes {
        let rel = format!("app-requests/{}", note.name);
        let path = vault::resolve_inside(root, &rel)?;
        ensure!(
            std::fs::metadata(path)?.len() <= 65536,
            "request note exceeds 64 KiB"
        );
        let body = vault::read_text(root, &rel)?;
        if !is_closed(&body) {
            open.push(Request {
                name: note.name,
                body,
            });
        }
    }
    open.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(Snapshot { open })
}
fn is_closed(body: &str) -> bool {
    body.lines().any(|line| {
        matches!(
            line.trim().to_ascii_lowercase().as_str(),
            "status: closed" | "status: done"
        )
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_empty_open_closed_and_external_notes() {
        let d = tempfile::tempdir().unwrap();
        assert!(snapshot(d.path()).unwrap().open.is_empty());
        std::fs::create_dir(d.path().join("app-requests")).unwrap();
        std::fs::write(
            d.path().join("app-requests/open.md"),
            "# Missing block\nFormat: english-reading\nExample: synthetic",
        )
        .unwrap();
        std::fs::write(
            d.path().join("app-requests/closed.md"),
            "---\nstatus: closed\n---\n# Done",
        )
        .unwrap();
        std::fs::write(d.path().join("app-requests/ignored.json"), "{}").unwrap();
        let s = snapshot(d.path()).unwrap();
        assert_eq!(s.open.len(), 1);
        assert_eq!(s.open[0].name, "open.md");
        std::fs::write(d.path().join("app-requests/open.md"), "Status: done\n").unwrap();
        assert!(snapshot(d.path()).unwrap().open.is_empty());
        #[cfg(unix)]
        {
            let out = tempfile::tempdir().unwrap();
            std::fs::write(out.path().join("private.md"), "synthetic private").unwrap();
            std::os::unix::fs::symlink(
                out.path().join("private.md"),
                d.path().join("app-requests/link.md"),
            )
            .unwrap();
            assert!(snapshot(d.path()).is_err());
        }
    }
}
