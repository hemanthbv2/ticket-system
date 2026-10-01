"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import {
  SendIcon,
  UserIcon,
  BuildingIcon,
  MailIcon,
  CalendarIcon,
  AlertTriangleIcon,
  TagIcon,
} from "lucide-react";

type Category = { id: string; name: string };

export default function NewTicketPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user as any;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          categoryId: categoryId || null,
          priority,
          dueDate: dueDate || null,
          attachments,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create ticket");
      }

      const ticket = await res.json();
      router.push(`/tickets/${ticket.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const priorities = [
    { value: "Low", color: "from-slate-600 to-slate-500", label: "Low" },
    { value: "Medium", color: "from-blue-600 to-blue-500", label: "Medium" },
    { value: "High", color: "from-orange-600 to-orange-500", label: "High" },
    { value: "Urgent", color: "from-red-600 to-red-500", label: "Urgent" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">New Ticket</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Report an issue — start by taking a photo or uploading an image.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo Section (First!) */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            📸 Photo / Screenshot
            <span className="text-xs text-slate-600 font-normal">(recommended)</span>
          </h2>
          <ImageUploader onFilesSelected={setAttachments} />
        </div>

        {/* Description */}
        <div className="glass-card p-5">
          <label className="text-sm font-semibold text-slate-300 mb-2 block">
            What&apos;s the issue? <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g. "Edit PC not starting — shows blue screen on boot"'
            rows={3}
            className="input-field resize-none"
            required
          />
        </div>

        {/* Category chips */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-indigo-400" />
            Category
            <span className="text-xs text-slate-600 font-normal">(optional)</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={`chip ${!categoryId ? "chip-active" : "chip-inactive"}`}
            >
              Not sure
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`chip ${categoryId === cat.id ? "chip-active" : "chip-inactive"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-orange-400" />
            Priority
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  priority === p.value
                    ? `bg-gradient-to-r ${p.color} text-white border-transparent shadow-lg`
                    : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            Required by
            <span className="text-xs text-slate-600 font-normal">(optional)</span>
          </h2>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input-field max-w-xs"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* Auto-filled identity (read-only) */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Your Details (auto-filled)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <UserIcon className="w-4 h-4 text-slate-600" />
              <span>{user?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MailIcon className="w-4 h-4 text-slate-600" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <BuildingIcon className="w-4 h-4 text-slate-600" />
              <span>{user?.department}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <UserIcon className="w-4 h-4 text-slate-600" />
              <span>{user?.designation}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Ticket...
            </>
          ) : (
            <>
              <SendIcon className="w-5 h-5" />
              Submit Ticket
            </>
          )}
        </button>
      </form>
    </div>
  );
}
