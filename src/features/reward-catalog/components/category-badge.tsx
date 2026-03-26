interface CategoryBadgeProps {
  name: string;
  color: string;
}

export function CategoryBadge({ name, color }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium border"
      style={{
        backgroundColor: color + "18",
        color,
        borderColor: color + "40",
      }}
    >
      {name}
    </span>
  );
}
