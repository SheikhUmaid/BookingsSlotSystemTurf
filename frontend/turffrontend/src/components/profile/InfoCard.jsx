
import { useState } from "react";

export default function BasicInfoCard({
  profile = {
    name: "Alex Morgan",
    email: "alex.morgan@email.com",
    phone: "+91 98765 43210",
  },
  onSave,
}) {
  const [details, setDetails] = useState(profile);
  const [activeField, setActiveField] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const fields = [
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
  ];

  function openEdit(field) {
    setActiveField(field);
    setInputValue(details[field.key]);
  }

  function closeEdit() {
    setActiveField(null);
    setInputValue("");
  }

  function saveEdit() {
    const value = inputValue.trim();

    if (!activeField || !value) return;

    const updatedDetails = {
      ...details,
      [activeField.key]: value,
    };

    setDetails(updatedDetails);
    onSave?.(updatedDetails);
    closeEdit();
  }

  return (
    <>
      <section className="w-full px-5 pt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
            Basic Information
          </span>

          <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-wider text-[#68dba9]">
            Verified Profile
          </span>
        </div>

        <div className="space-y-3 rounded-lg bg-[#1e2022] p-5 shadow-sm">
          {fields.map((field, index) => (
            <div
              key={field.key}
              className={`flex items-center justify-between gap-3 py-2 ${
                index !== fields.length - 1
                  ? "border-b border-[#282a2c]/60"
                  : ""
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-wider text-[#bccac0]">
                  {field.label}
                </span>

                <span className="mt-0.5 break-words font-['Hanken_Grotesk'] text-[15px] font-medium text-[#e2e2e5]">
                  {details[field.key]}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openEdit(field)}
                className="flex shrink-0 items-center gap-1 rounded bg-[#282a2c] px-2.5 py-1.5 font-['Space_Grotesk'] text-[11px] font-semibold uppercase text-[#68dba9] transition-colors hover:bg-[#333537]"
              >
                <span className="material-symbols-outlined text-[14px]">
                  edit
                </span>
                Edit
              </button>
            </div>
          ))}
        </div>
      </section>

      {activeField && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#121416]/85 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEdit();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="relative w-full max-w-xs rounded-xl bg-[#1e2022] p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={closeEdit}
              aria-label="Close dialog"
              className="absolute right-3 top-3 text-[#bccac0] hover:text-[#e2e2e5]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[#68dba9]">
                edit_note
              </span>

              <span
                id="edit-profile-title"
                className="font-['Space_Grotesk'] text-sm font-semibold uppercase tracking-wider text-[#e2e2e5]"
              >
                Update Detail
              </span>
            </div>

            <label
              htmlFor="profile-edit-input"
              className="mb-1 block font-['Space_Grotesk'] text-[11px] font-semibold uppercase text-[#bccac0]"
            >
              {activeField.label}
            </label>

            <input
              id="profile-edit-input"
              type={activeField.key === "email" ? "email" : "text"}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveEdit();
                if (event.key === "Escape") closeEdit();
              }}
              autoFocus
              className="mb-4 w-full rounded border border-[#3d4a42] bg-[#282a2c] px-3 py-2 font-['Hanken_Grotesk'] text-[15px] text-[#e2e2e5] outline-none focus:border-[#68dba9]"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded px-3 py-1.5 font-['Space_Grotesk'] text-[11px] font-semibold uppercase text-[#bccac0] hover:text-[#e2e2e5]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={!inputValue.trim()}
                className="rounded bg-[#68dba9] px-4 py-1.5 font-['Space_Grotesk'] text-[11px] font-semibold uppercase text-[#003825] transition-colors hover:bg-[#4edea3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
