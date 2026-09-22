import React from "react";

const Input = React.forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && <label className="label">{label}</label>}

        <input
          ref={ref}
          className={`input ${error ? "!border-red-500" : ""} ${className}`}
          {...props}
        />

        {error && (
          <p className="mt-1 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;