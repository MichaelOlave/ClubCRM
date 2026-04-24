import ast
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"


def add_api_root_to_path() -> None:
    if str(API_ROOT) not in sys.path:
        sys.path.insert(0, str(API_ROOT))


def collect_import_violations(relative_dir: str, forbidden_prefixes: tuple[str, ...]) -> list[str]:
    violations: list[str] = []

    for path in sorted((SRC_ROOT / relative_dir).rglob("*.py")):
        module_tree = ast.parse(path.read_text())

        for node in ast.walk(module_tree):
            imported_modules: list[str] = []

            if isinstance(node, ast.Import):
                imported_modules = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module is not None:
                imported_modules = [node.module]

            for imported_module in imported_modules:
                for prefix in forbidden_prefixes:
                    if imported_module == prefix or imported_module.startswith(f"{prefix}."):
                        violations.append(f"{path.relative_to(SRC_ROOT)} -> {imported_module}")

    return violations
