export default function Select({ label, options, className = "", ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      <select className={`input ${className}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
