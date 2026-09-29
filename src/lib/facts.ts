/** docs/facts.md 표의 첫 열(id)만 뽑는다. id 형식은 '프로젝트.주제'. 헤더·구분선은 건너뛴다. */
export function parseFactIds(markdown: string): string[] {
  const ids: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([a-z0-9]+\.[a-z0-9-]+)\s*\|/);
    if (m) ids.push(m[1]);
  }
  return ids;
}
