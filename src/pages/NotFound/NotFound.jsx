import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-4 text-6xl">🧭</div>
      <h1 className="mb-2 text-3xl font-extrabold">Page not found</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );
}
