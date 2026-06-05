from pathlib import Path

PUBLIC_CONTEXT_DOCS = [
    "README.md",
    "docs/README.md",
    "docs/architecture.md",
    "docs/api-consumer-guide.md",
    "docs/development/live-testing.md",
    "docs/contributing.md",
]


def generate_llms_txt():
    content = "# HealthArchive - Developer Assistant Context\n\n"
    content += "This file provides high-level context for automated developer assistants working on HealthArchive.\n\n"

    for doc_path in PUBLIC_CONTEXT_DOCS:
        path = Path(doc_path)
        if path.exists():
            content += f"## {doc_path}\n\n"
            content += path.read_text(encoding="utf-8")
            content += "\n\n---\n\n"

    Path("docs/llms.txt").write_text(content, encoding="utf-8")
    print("Generated docs/llms.txt")


if __name__ == "__main__":
    generate_llms_txt()
