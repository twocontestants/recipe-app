/** Shared protein vocabulary for extraction, the recipe form, and planner badges. */
export const PROTEIN_OPTIONS = [
  'chicken', 'beef', 'pork', 'lamb', 'duck', 'fish', 'seafood',
  'tofu', 'eggs', 'legumes', 'dairy', 'other',
] as const;

export type ProteinType = typeof PROTEIN_OPTIONS[number];

export const PROTEIN_COLORS: Record<ProteinType, string> = {
  chicken: '#E8A838',
  beef:    '#C0392B',
  pork:    '#D4697A',
  lamb:    '#8E44AD',
  duck:    '#8B4513',
  fish:    '#2980B9',
  seafood: '#16A085',
  tofu:    '#27AE60',
  eggs:    '#D4AC0D',
  legumes: '#A04000',
  dairy:   '#717D7E',
  other:   '#5C6B7A',
};

export const PROTEIN_EMOJI: Record<ProteinType, string> = {
  chicken: '🍗',
  beef:    '🥩',
  pork:    '🐷',
  lamb:    '🐑',
  duck:    '🦆',
  fish:    '🐟',
  seafood: '🦐',
  tofu:    '🫘',
  eggs:    '🥚',
  legumes: '🫘',
  dairy:   '🧀',
  other:   '🍖',
};
