"use client";

import { useState } from "react";
import { ChevronLeft, ArrowRight, Calendar } from "lucide-react";
import { toast } from "sonner";

export interface PersonalDetailsData {
  dateOfBirth: string;
  gender: string;
}

interface Props {
  initial: PersonalDetailsData;
  onNext: (data: PersonalDetailsData) => void;
  onBack: () => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

function getMaxDobForMinimumAge(minAge: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  return d.toISOString().split("T")[0];
}

function isAtLeastAge(dob: string, minAge: number) {
  if (!dob) return false;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age >= minAge;
}

export default function StepPersonalDetails({ initial, onNext, onBack }: Props) {
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth || "");
  const [gender, setGender] = useState(initial.gender || "");

  const handleNext = () => {
    if (!dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }
    if (!isAtLeastAge(dateOfBirth, 16)) {
      toast.error("You must be at least 16 years old");
      return;
    }
    if (!gender) {
      toast.error("Please select a gender");
      return;
    }
    onNext({ dateOfBirth, gender });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 2 of 7</p>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">Personal Details</h1>
        <p className="text-xs sm:text-sm text-foreground/40">Tell us a little about yourself.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Date of Birth</label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={getMaxDobForMinimumAge(16)}
            className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-3 sm:py-4 text-sm font-medium text-foreground/70 focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
          />
        </div>
        <p className="text-[11px] text-foreground/30 px-1">Minimum age: 16 years</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Gender</label>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGender(opt.value)}
              className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-all border ${
                gender === opt.value
                  ? "bg-primary text-black border-primary"
                  : "bg-card border-border/50 text-foreground/50 hover:border-primary/40 hover:text-foreground/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-3 sm:px-5 sm:py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 sm:py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
