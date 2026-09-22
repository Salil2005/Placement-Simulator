export default function Loader({ fullScreen = false, label = "Loading..." }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 ${
        fullScreen ? "h-screen w-full" : "py-10"
      }`}
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
