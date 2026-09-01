function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function buildIndex(nodes) {
  return nodes.map(n => ({
    id: n.id,
    haystack: norm([
      n.id, n.title, n.family,
      ...(n.domains || []),
      ...(n.examples || []),
      n.html_description
    ].join(' '))
  }));
}

export function search(index, query, limit = 20) {
  const q = norm(query.trim());
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const it of index) {
    let score = 0, ok = true;
    for (const t of tokens) {
      const idx = it.haystack.indexOf(t);
      if (idx < 0) { ok = false; break; }
      score += 1 / (1 + idx);
    }
    if (ok) scored.push({ id: it.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.id);
}
