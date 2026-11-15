# Mellorin block requests

If a format needs a block outside the installed library, create `app-requests/YYYY-MM-DD-block-name.md` in the vault. Include what is needed, a data-only example and the requesting format. The renderer creates a minimal note automatically, preserving an existing note with the same date/block name.

Example:

```md
# Requested block: diagram
Status: open
Format: formats/devops-topic.json

Need: show a graph described as nodes and links.
Example: {"type":"diagram","props":{"nodes":["client","server"]}}
```

The app badge shows open notes. Existing notes without status count as open; a standalone `Status: closed` or `Status: done` line closes one. Use a synthetic vault for implementation tests. Review the request, implement and test the missing block, then close its note after verification. Never copy personal vault contents into public issues, commits or screenshots.
