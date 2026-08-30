const PROTEINS = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'tofu', 'eggs', 'legumes', 'dairy'] as const;

export const PROTEIN_OPTIONS = PROTEINS;

export const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#E8A838',
  beef:    '#C0392B',
  pork:    '#D4697A',
  lamb:    '#8E44AD',
  fish:    '#2980B9',
  seafood: '#16A085',
  tofu:    '#27AE60',
  eggs:    '#D4AC0D',
  legumes: '#A04000',
  dairy:   '#717D7E',
};

export const PROTEIN_EMOJI: Record<string, string> = {
  chicken: '🍗',
  beef:    '🥩',
  pork:    '🐷',
  lamb:    '🐑',
  fish:    '🐟',
  seafood: '🦐',
  tofu:    '🫘',
  eggs:    '🥚',
  legumes: '🫘',
  dairy:   '🧀',
};

export function ProteinBadge({ protein, size = 'sm' }: { protein?: string; size?: 'sm' | 'xs' }) {
  if (!protein) return null;
  const color = PROTEIN_COLORS[protein] || '#888';
  const emoji = PROTEIN_EMOJI[protein] || '🍽';
  return (
    <span
      className={`protein-badge protein-badge-${size}`}
      style={{ background: color + '22', color, borderColor: color + '44' }}
      title={`Primary protein: ${protein}`}
    >
      {emoji} {protein}
    </span>
  );
}
