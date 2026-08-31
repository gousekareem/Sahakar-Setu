export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-16 text-stone-400 text-sm gap-2">
      <span className="w-4 h-4 rounded-full border-2 border-coop-300 border-t-coop-600 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <p className="text-stone-700 font-semibold">{title}</p>
      {subtitle && <p className="text-stone-400 text-sm mt-1 max-w-sm">{subtitle}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="flex items-center justify-center py-16 text-center px-4">
      <p className="text-red-600 text-sm">{message}</p>
    </div>
  );
}
