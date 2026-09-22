import Header from "./Header.jsx";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-400 dark:border-slate-800/80">
        Built with the MERN stack · Placement Simulator © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
