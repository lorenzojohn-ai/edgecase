import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'EdgeCase | Build it. Break it. Make it better.',
  description: 'Evidence-first AI-assisted testing for student developers.'
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
