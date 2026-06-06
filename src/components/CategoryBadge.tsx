import type { Category } from '../types';
import { CATEGORY_META } from '../data/categories';

export function CategoryBadge({ category }: { category: Category }): JSX.Element {
  const meta = CATEGORY_META[category];
  return (
    <span className="badge" style={{ background: meta.color }}>
      <span aria-hidden>{meta.emoji}</span>
      {category}
    </span>
  );
}
