import shutil
from pathlib import Path


def main():
    root_dir = Path(__file__).parent.parent
    docs_dir = root_dir / "docs"
    readme_file = root_dir / "README.md"
    target_dir = root_dir / "apps" / "web" / "public" / "docs"

    if target_dir.exists():
        shutil.rmtree(target_dir)

    target_dir.mkdir(parents=True, exist_ok=True)

    if docs_dir.exists():
        for item in docs_dir.iterdir():
            if item.is_dir():
                shutil.copytree(item, target_dir / item.name, dirs_exist_ok=True)
            else:
                shutil.copy2(item, target_dir / item.name)
        print(f"Synced {docs_dir} to {target_dir}")
    else:
        print(f"Docs directory not found at {docs_dir}")

    if readme_file.exists():
        shutil.copy2(readme_file, target_dir / "ROOT-README.md")
        print(f"Synced {readme_file} to {target_dir / 'ROOT-README.md'}")
    else:
        print(f"Root README.md not found at {readme_file}")


if __name__ == "__main__":
    main()
