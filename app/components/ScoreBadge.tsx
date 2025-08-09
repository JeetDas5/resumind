import React from "react";

type ScoreBadgeProps = {
  score: number;
  className?: string;
};

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, className = "" }) => {
  const { bgClass, textClass, label } =
    score > 69
      ? { bgClass: "bg-badge-green", textClass: "text-green-600", label: "Strong" }
      : score > 49
      ? { bgClass: "bg-badge-yellow", textClass: "text-yellow-600", label: "Needs work" }
      : { bgClass: "bg-badge-red", textClass: "text-red-600", label: "Needs work" };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 ${bgClass} ${textClass} ${className}`}
    >
      <p className="text-xs font-medium leading-none">{label}</p>
    </div>
  );
};

export default ScoreBadge;
