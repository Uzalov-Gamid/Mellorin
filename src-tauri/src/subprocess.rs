use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

pub struct SubprocessManager {
    child: Mutex<Option<Child>>,
    stdin: Mutex<Option<tokio::process::ChildStdin>>,
    running: Arc<AtomicBool>,
}

impl SubprocessManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            stdin: Mutex::new(None),
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub async fn start(
        &self,
        claude_path: &str,
        on_output: impl Fn(String) + Send + 'static,
        on_exit: impl Fn() + Send + 'static,
    ) -> anyhow::Result<()> {
        if self.is_running() {
            return Ok(());
        }

        let mut child = Command::new(claude_path)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()?;

        let stdout = child.stdout.take().expect("stdout was piped");
        let stdin = child.stdin.take().expect("stdin was piped");

        self.running.store(true, Ordering::SeqCst);

        let running = Arc::clone(&self.running);
        tokio::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                on_output(line);
            }
            running.store(false, Ordering::SeqCst);
            on_exit();
        });

        *self.stdin.lock().await = Some(stdin);
        *self.child.lock().await = Some(child);
        Ok(())
    }

    pub async fn send(&self, message: &str) -> anyhow::Result<()> {
        let mut guard = self.stdin.lock().await;
        let stdin = guard.as_mut().ok_or_else(|| anyhow::anyhow!("not running"))?;
        stdin.write_all(format!("{message}\n").as_bytes()).await?;
        stdin.flush().await?;
        Ok(())
    }

    pub async fn stop(&self) -> anyhow::Result<()> {
        if let Some(mut child) = self.child.lock().await.take() {
            child.kill().await?;
        }
        *self.stdin.lock().await = None;
        self.running.store(false, Ordering::SeqCst);
        Ok(())
    }
}
