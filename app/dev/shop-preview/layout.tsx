import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping list preview',
  robots: { index: false, follow: false },
};

export default function ShopPreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
