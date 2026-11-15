//! MIME allowlist from signatures and extension; active SVG/HTML are never returned.
use anyhow::{ensure, Result};
use serde::Serialize;
use std::path::Path;
const MAX_ATTACHMENT: usize = 8 * 1024 * 1024;
#[derive(Serialize)]
pub struct Attachment {
    pub mime: &'static str,
    pub bytes: Vec<u8>,
}
pub fn read(vault: &Path, relative: &str) -> Result<Attachment> {
    let path = crate::notes::resolve(vault, relative)?;
    let bytes = crate::notes::bounded(&path, MAX_ATTACHMENT)?;
    let ext = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let mime = match ext.as_str() {
        "png" if bytes.starts_with(b"\x89PNG\r\n\x1a\n") => "image/png",
        "jpg" | "jpeg" if bytes.starts_with(&[0xff, 0xd8, 0xff]) => "image/jpeg",
        "gif" if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") => "image/gif",
        "webp" if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") => "image/webp",
        "pdf" if bytes.starts_with(b"%PDF-") => "application/pdf",
        "wav" if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WAVE") => "audio/wav",
        "ogg" if bytes.starts_with(b"OggS") => "audio/ogg",
        "mp3"
            if bytes.starts_with(b"ID3")
                || (bytes.first() == Some(&0xff)
                    && bytes.get(1).is_some_and(|b| b & 0xe0 == 0xe0)) =>
        {
            "audio/mpeg"
        }
        _ => "",
    };
    ensure!(
        !mime.is_empty(),
        "Неподдерживаемый MIME или содержимое вложения"
    );
    Ok(Attachment { mime, bytes })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn signatures_extensions_size_and_traversal() {
        let dir = tempfile::tempdir().unwrap();
        fs_write(dir.path(), "safe.png", b"\x89PNG\r\n\x1a\nsynthetic");
        assert_eq!(read(dir.path(), "safe.png").unwrap().mime, "image/png");
        for (name, data) in [
            ("fake.png", b"<script>".as_slice()),
            ("active.svg", b"<svg/>"),
            ("fake.pdf", b"not pdf"),
        ] {
            fs_write(dir.path(), name, data);
            assert!(read(dir.path(), name).is_err());
        }
        fs_write(dir.path(), "large.png", &vec![0; MAX_ATTACHMENT + 1]);
        assert!(read(dir.path(), "large.png").is_err());
        assert!(read(dir.path(), "../safe.png").is_err());
    }
    fn fs_write(root: &Path, name: &str, data: &[u8]) {
        std::fs::write(root.join(name), data).unwrap();
    }
}
