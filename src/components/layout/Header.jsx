import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import Button from "../ui/Button.jsx";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#080d1d]/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 md:px-8">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xs text-white shadow-lg shadow-brand-600/25">
            PS
          </span>
          Placement Simulator
        </Link>

        <nav className="flex items-center gap-1.5">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-ghost hidden sm:inline-flex">Dashboard</Link>
              <Link to="/history" className="btn-ghost hidden sm:inline-flex">History</Link>
              <Link to="/placement" className="btn-ghost hidden md:inline-flex">Placement</Link>
              <Link to="/resume" className="btn-ghost hidden md:inline-flex">Resume</Link>
              <Link to="/interview/create" className="btn-primary">New Interview</Link>
              <Link to="/profile" aria-label="Profile" className="btn-ghost !px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </span>
              </Link>
              <Button variant="secondary" className="hidden lg:inline-flex" onClick={() => { logout(); navigate("/"); }}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Login</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </>
          )}
          <button onClick={toggleTheme} aria-label="Toggle theme" className="btn-secondary !px-3">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </nav>
      </div>
    </header>
  );
}
