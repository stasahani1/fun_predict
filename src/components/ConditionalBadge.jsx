export default function ConditionalBadge({ condition, conditionMet }) {
  const bgColor =
    conditionMet === null || conditionMet === undefined
      ? "bg-gray-100 text-gray-600 border-gray-200"
      : conditionMet === true
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-600 border-red-200";

  const statusText =
    conditionMet === null || conditionMet === undefined
      ? ""
      : conditionMet === true
      ? " (Met)"
      : " (Not met — Voided)";

  return (
    <div className={`rounded-xl p-3 border text-sm font-medium mb-3 ${bgColor}`}>
      <span className="font-bold">IF:</span> {condition}
      {statusText && (
        <span className="ml-1 font-bold">{statusText}</span>
      )}
    </div>
  );
}
