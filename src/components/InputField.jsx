const InputField = ({
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  icon,
  error,
  showPassword,
  onTogglePassword,
}) => {
  const inputType =
    type === "password" && showPassword ? "text" : type;

  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        <span>
            {label}
        </span>
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <i className={`bi ${icon} text-gray-400`}></i>
        </div>

        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-gray-50 py-3.5 pl-11 pr-12 text-sm text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-4 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-gray-200 focus:border-blue-700 focus:ring-blue-100"
          }`}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 transition hover:text-blue-800"
            aria-label={
              showPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
          >
            <i
              className={`bi ${
                showPassword
                  ? "bi-eye-slash"
                  : "bi-eye"
              }`}
            ></i>
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
          <i className="bi bi-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default InputField;