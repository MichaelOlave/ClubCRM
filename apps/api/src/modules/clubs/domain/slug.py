import re
import unicodedata

_NON_ALPHANUMERIC_PATTERN = re.compile(r"[^a-z0-9]+")
_EDGE_HYPHEN_PATTERN = re.compile(r"(^-+|-+$)")


def slugify_club_name(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    collapsed = _NON_ALPHANUMERIC_PATTERN.sub("-", ascii_name.lower()).strip()
    slug = _EDGE_HYPHEN_PATTERN.sub("", collapsed)

    return slug or "club"
