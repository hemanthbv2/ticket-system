"use client";

import { getStepperIndex, STEPPER_STEPS } from "@/lib/constants";

interface TicketStepperProps {
  status: string;
  compact?: boolean;
}

export default function TicketStepper({ status, compact = false }: TicketStepperProps) {
  const currentIdx = getStepperIndex(status);
  const isWaiting = status === "Waiting on Requester";
  const isCancelled = status === "Cancelled";

  if (isCancelled) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "text-xs" : ""}`}>
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-xs">✕</span>
        </div>
        <span className="text-red-400 font-medium text-sm">Cancelled</span>
      </div>
    );
  }

  if (compact) {
    // Mini progress bar for ticket list
    const percent = currentIdx >= 0 ? ((currentIdx + 1) / STEPPER_STEPS.length) * 100 : 0;
    return (
      <div className="w-full">
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isWaiting
                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                : status === "Closed"
                ? "bg-gradient-to-r from-slate-500 to-slate-400"
                : "bg-gradient-to-r from-indigo-500 to-cyan-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-slate-500">New</span>
          <span className="text-[10px] text-slate-500">Closed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700/50 mx-6" />

        {/* Animated fill line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 mx-6 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: currentIdx >= 0 ? `${(currentIdx / (STEPPER_STEPS.length - 1)) * 100}%` : "0%",
            background: isWaiting
              ? "linear-gradient(90deg, #22c55e 0%, #22c55e 70%, #f59e0b 100%)"
              : "linear-gradient(90deg, #22c55e, #6366f1)",
          }}
        />

        {STEPPER_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isCurrentWaiting = isCurrent && isWaiting;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              {/* Step circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  isDone
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : isCurrent
                    ? isCurrentWaiting
                      ? "bg-amber-500 text-white pulse-amber shadow-lg shadow-amber-500/30"
                      : "bg-indigo-500 text-white pulse-active shadow-lg shadow-indigo-500/30"
                    : "bg-slate-700 text-slate-500"
                }`}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Step label */}
              <span
                className={`mt-2 text-xs font-medium whitespace-nowrap ${
                  isDone
                    ? "text-green-400"
                    : isCurrent
                    ? isCurrentWaiting
                      ? "text-amber-400"
                      : "text-indigo-300"
                    : "text-slate-600"
                }`}
              >
                {step}
              </span>

              {/* Waiting indicator */}
              {isCurrentWaiting && (
                <span className="mt-1 text-[10px] text-amber-400/80 font-medium animate-pulse">
                  ⏸ Waiting
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
