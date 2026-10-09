import { PROTEIN_COLORS, PROTEIN_EMOJI, type ProteinType } from '@/lib/proteins';

export { PROTEIN_COLORS, PROTEIN_EMOJI, PROTEIN_OPTIONS } from '@/lib/proteins';

function proteinColor(protein: string): string {
  return protein in PROTEIN_COLORS ? PROTEIN_COLORS[protein as ProteinType] : '#888';
}

function proteinEmoji(protein: string): string {
  return protein in PROTEIN_EMOJI ? PROTEIN_EMOJI[protein as ProteinType] : '🍽';
}

export function ProteinBadge({ protein, size = 'sm' }: { protein?: string; size?: 'sm' | 'xs' }) {
  if (!protein) return null;
  const color = proteinColor(protein);
  const emoji = proteinEmoji(protein);
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
