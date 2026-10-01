/** Ticket status constants and utilities */

export const STATUSES = [
  "New",
  "Assigned",
  "In Progress",
  "Waiting on Requester",
  "Resolved",
  "Closed",
  "Cancelled",
] as const;

export type TicketStatus = (typeof STATUSES)[number];

/** Stepper steps for the progress tracker (excluding Cancelled/Waiting) */
export const STEPPER_STEPS = [
  "New",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
] as const;

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-500",
  Medium: "bg-blue-500",
  High: "bg-orange-500",
  Urgent: "bg-red-600",
};

export const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-500",
  Assigned: "bg-indigo-500",
  "In Progress": "bg-yellow-500",
  "Waiting on Requester": "bg-amber-500",
  Resolved: "bg-green-500",
  Closed: "bg-gray-500",
  Cancelled: "bg-red-500",
};

/** Get the stepper index for a given status (0-4) */
export function getStepperIndex(status: string): number {
  if (status === "Waiting on Requester") return 2; // Shows on "In Progress" step
  if (status === "Cancelled") return -1;
  const idx = STEPPER_STEPS.indexOf(status as any);
  return idx >= 0 ? idx : 0;
}

/** Get progress percentage for mini progress bar */
export function getProgressPercent(status: string): number {
  const map: Record<string, number> = {
    New: 10,
    Assigned: 25,
    "In Progress": 50,
    "Waiting on Requester": 50,
    Resolved: 85,
    Closed: 100,
    Cancelled: 100,
  };
  return map[status] ?? 0;
}

/** Valid status transitions */
export function getValidTransitions(status: string, role: string): string[] {
  const agentTransitions: Record<string, string[]> = {
    New: ["Assigned"],
    Assigned: ["In Progress"],
    "In Progress": ["Waiting on Requester", "Resolved"],
    "Waiting on Requester": ["In Progress"],
    Resolved: ["Closed"],
  };

  const requesterTransitions: Record<string, string[]> = {
    New: ["Cancelled"],
    Assigned: ["Cancelled"],
    Resolved: ["Closed"],
  };

  if (role === "agent" || role === "admin") {
    return agentTransitions[status] || [];
  }
  return requesterTransitions[status] || [];
}

/** File validation */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: images, PDF`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max: 10 MB`;
  }
  return null;
}
