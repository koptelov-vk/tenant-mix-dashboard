from __future__ import annotations

import html
import json
import re
from urllib.request import Request, urlopen


URL = "https://zharptitsann.ru/news"
PATTERNS = [
    "Belle",
    "РЕСТОРАН",
    "ХАЧАПУРИ",
    "ЛЭТУАЛЬ",
    "скоро откроется",
    "СКОРО ОТКРЫТИЕ",
]


def visible_snippet(source: str, start: int, end: int) -> str:
    snippet = source[max(0, start - 700) : end + 1000]
    snippet = re.sub(r"<[^>]+>", " ", snippet)
    return " ".join(html.unescape(snippet).split())


def main() -> None:
    request = Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    source = urlopen(request, timeout=45).read().decode("utf-8", "replace")
    print(f"length={len(source)}")
    for pattern in PATTERNS:
        matches = list(re.finditer(re.escape(pattern), source, re.IGNORECASE))
        print(f"\n[{pattern}] count={len(matches)}")
        for match in matches[:5]:
            print(visible_snippet(source, match.start(), match.end())[:1600])
    print("\n[links]")
    links = sorted(set(re.findall(r'''href=["']([^"']+)''', source)))
    for link in links:
        if any(term in link.lower() for term in ("news", "belle", "rest", "food")):
            print(link)
    print("\n[feed-config]")
    for match in re.finditer(r".{0,180}(?:feed|post|category).{0,320}", source, re.IGNORECASE):
        snippet = " ".join(html.unescape(match.group(0)).split())
        if "t-feed" in snippet or "data-feed" in snippet or "feeduid" in snippet:
            print(snippet[:800])

    feed_url = (
        "https://feeds.tildacdn.com/api/getfeed/"
        "?feeduid=601911584391&recid=1191178666&slice=1"
        "&sort%5Bdate%5D=desc&filters%5Bdate%5D=&getparts=true"
    )
    feed_request = Request(feed_url, headers={"User-Agent": "Mozilla/5.0"})
    feed = json.loads(urlopen(feed_request, timeout=45).read().decode("utf-8"))
    print("\n[news-posts]")
    for post in feed.get("posts", []):
        title = " ".join(html.unescape(post.get("title", "")).split())
        descr = re.sub(r"<[^>]+>", " ", post.get("descr", ""))
        descr = " ".join(html.unescape(descr).split())
        print(f"{post.get('date')} | {title} | {post.get('url')} | {descr[:500]}")


if __name__ == "__main__":
    main()
