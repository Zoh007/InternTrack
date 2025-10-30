import '../styles/globals.css';
import { Inter } from 'next/font/google';
import AuthProvider from '../components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "InternTrack",
  description: "Internships, jobs, and interview prep for students"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased bg-[#f7fafd] text-gray-900 relative`}>
        {/* Faint abstract SVG shape (decorative, not accessible) */}
        <svg
          aria-hidden="true"
          className="pointer-events-none select-none fixed top-0 right-0 md:w-[36vw] w-[70vw] md:h-[36vw] h-[70vw] -z-10"
          style={{ opacity: 0.07 }}
          viewBox="0 0 700 700"
        >
          <defs>
            <radialGradient id="fadeBlue" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#4582ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f7fafd" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="350" cy="330" rx="320" ry="250" fill="url(#fadeBlue)" />
        </svg>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white rounded px-3 py-1 shadow">Skip to content</a>
        <AuthProvider>
          <header className="border-b bg-white backdrop-blur sticky top-0 z-20">
            <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
              <a href="/" className="font-semibold text-blue-700 text-lg">InternTrack</a>
              <nav className="flex gap-6 text-sm">
                <a href="/jobs" className="hover:text-blue-700 transition-colors">Jobs</a>
                <a href="/tracker" className="hover:text-blue-700 transition-colors">Tracker</a>
                <a href="/prep" className="hover:text-blue-700 transition-colors">Prep</a>
                <a href="/profile" className="hover:text-blue-700 transition-colors">Profile</a>
              </nav>
            </div>
          </header>
          <main id="content" className="mx-auto max-w-7xl px-6 py-16">
            {children}
          </main>
          <footer className="border-t bg-white">
            <div className="mx-auto max-w-7xl px-6 py-6 text-sm text-gray-500">© {new Date().getFullYear()} InternTrack</div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

