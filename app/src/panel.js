function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function tags(node) {
  const out = [];
  if (node.canonical)  out.push('<span class="tag canonical">canonique</span>');
  if (node.palieronic) out.push('<span class="tag palieronic">palieronique</span>');
  if (node.stability === 'instable') out.push('<span class="tag unstable">instable</span>');
  if (node.canonical && (node.weight ?? 0) >= 0.92) out.push('<span class="tag attractor">attracteur</span>');
  out.push(`<span class="tag">${esc(node.family)}</span>`);
  for (const d of (node.domains || [])) out.push(`<span class="tag">${esc(d)}</span>`);
  return out.join('');
}

function relList(label, ids, onPick) {
  if (!ids || ids.length === 0) return '';
  const links = ids.map(id => `<a data-pick="${esc(id)}">${esc(id)}</a>`).join('');
  return `<section class="relations"><h4>${esc(label)}</h4>${links}</section>`;
}

export function renderDetail(node, onPick) {
  const detail = document.getElementById('detail');
  const body = document.getElementById('detail-body');
  if (!node) {
    detail.classList.add('hidden');
    detail.setAttribute('aria-hidden', 'true');
    return;
  }

  const eqs = (node.equations || []).map(e => `<code>${esc(e)}</code>`).join('');
  const ex  = (node.examples  || []).map(e => `<li>${esc(e)}</li>`).join('');

  body.innerHTML = `
    <h2>${esc(node.title)}</h2>
    <div class="meta">${esc(node.id)} · famille <strong>${esc(node.family)}</strong> · poids ${(node.weight ?? 0).toFixed(2)}</div>
    <div class="tags">${tags(node)}</div>
    <section><p class="desc">${esc(node.html_description || '')}</p></section>
    <section><div class="scores">
      <div class="score"><div class="v">${(node.S_local  ?? 0).toFixed(2)}</div><div class="l">S_local</div></div>
      <div class="score"><div class="v">${(node.S_global ?? 0).toFixed(2)}</div><div class="l">S_global</div></div>
    </div></section>
    ${eqs ? `<section class="equations"><h4>Équations</h4>${eqs}</section>` : ''}
    ${ex  ? `<section><h4>Exemples</h4><ul class="examples">${ex}</ul></section>` : ''}
    ${relList('Parents',        node.parents,        onPick)}
    ${relList('Enfants',        node.children,       onPick)}
    ${relList('Reliées',        node.related,        onPick)}
    ${relList('Contradictions', node.contradictions, onPick)}
    ${node.doi ? `<section><h4>DOI</h4><code>${esc(node.doi)}</code></section>` : ''}
  `;

  body.querySelectorAll('a[data-pick]').forEach(a => {
    a.addEventListener('click', () => onPick(a.dataset.pick));
  });

  detail.classList.remove('hidden');
  detail.setAttribute('aria-hidden', 'false');
}
