import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, Dumbbell, Scale, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Exercise { id: string; name: string; sets: number; reps: number; }
interface WorkoutDay { dayOfWeek: number; exercises: Exercise[]; }
interface ShapeProfile { age?: number; heightCm?: number; weightKg?: number; }

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function calcBMI(height: number, weight: number) {
  const hm = height / 100;
  return weight / (hm * hm);
}

function bmiStatus(bmi: number) {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "#E53E3E" };
  if (bmi < 25) return { label: "Peso ideal", color: "#38A169" };
  if (bmi < 30) return { label: "Sobrepeso", color: "#ED8936" };
  return { label: "Obesidade", color: "#E53E3E" };
}

export default function Shape() {
  const { getToken } = useAuth();
  const [days, setDays] = useState<WorkoutDay[]>(Array.from({ length: 6 }, (_, i) => ({ dayOfWeek: i, exercises: [] })));
  const [profile, setProfile] = useState<ShapeProfile>({});
  const [profileForm, setProfileForm] = useState({ age: "", height: "", weight: "" });
  const [activeDay, setActiveDay] = useState(0);
  const [newExercise, setNewExercise] = useState({ name: "", sets: "3", reps: "12" });
  const [saving, setSaving] = useState(false);

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    return res.json();
  };

  useEffect(() => {
    Promise.all([authFetch("/api/workout/days"), authFetch("/api/workout/profile")]).then(([d, p]) => {
      if (Array.isArray(d) && d.length > 0) {
        setDays(prev => prev.map(day => {
          const found = d.find((x: WorkoutDay) => x.dayOfWeek === day.dayOfWeek);
          return found ? { ...day, exercises: (found.exercises as Exercise[]) || [] } : day;
        }));
      }
      if (p) {
        setProfile(p);
        setProfileForm({ age: p.age?.toString() ?? "", height: p.heightCm?.toString() ?? "", weight: p.weightKg?.toString() ?? "" });
      }
    });
  }, []);

  const saveDay = async (dayIdx: number, exercises: Exercise[]) => {
    setSaving(true);
    await authFetch(`/api/workout/days/${dayIdx}`, { method: "PUT", body: JSON.stringify({ exercises }) });
    setSaving(false);
  };

  const addExercise = () => {
    if (!newExercise.name.trim()) return;
    const exercise: Exercise = { id: crypto.randomUUID(), name: newExercise.name, sets: parseInt(newExercise.sets), reps: parseInt(newExercise.reps) };
    const newDays = days.map((d, i) => i === activeDay ? { ...d, exercises: [...d.exercises, exercise] } : d);
    setDays(newDays);
    saveDay(activeDay, newDays[activeDay]!.exercises);
    setNewExercise({ name: "", sets: "3", reps: "12" });
  };

  const removeExercise = (exId: string) => {
    const newDays = days.map((d, i) => i === activeDay ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) } : d);
    setDays(newDays);
    saveDay(activeDay, newDays[activeDay]!.exercises);
  };

  const saveProfile = async () => {
    setSaving(true);
    const p = await authFetch("/api/workout/profile", {
      method: "PUT",
      body: JSON.stringify({ age: parseInt(profileForm.age), heightCm: parseFloat(profileForm.height), weightKg: parseFloat(profileForm.weight) }),
    });
    setProfile(p);
    setSaving(false);
  };

  const bmi = profile.heightCm && profile.weightKg ? calcBMI(profile.heightCm, profile.weightKg) : null;
  const bmiInfo = bmi ? bmiStatus(bmi) : null;
  const currentDay = days[activeDay]!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1 flex items-center gap-3">
          <Dumbbell className="h-7 w-7 text-[#C9A84C]" /> Shape
        </h1>
        <p className="text-[#A89880] text-sm">Planner de treinos semanais e ficha corporal</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Ficha corporal */}
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest flex items-center gap-2">
            <Scale className="h-3.5 w-3.5" /> Ficha corporal
          </h3>
          <div className="space-y-3">
            {[["Idade (anos)", "age", "number"], ["Altura (cm)", "height", "number"], ["Peso (kg)", "weight", "number"]].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs text-[#6B7A8D] mb-1 block">{label}</label>
                <Input
                  type={type}
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={(e) => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                  className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C] h-9 text-sm"
                />
              </div>
            ))}
          </div>

          {bmi && bmiInfo && (
            <div className="p-3 rounded-lg border" style={{ borderColor: bmiInfo.color + "40", backgroundColor: bmiInfo.color + "11" }}>
              <p className="text-xs text-[#A89880] mb-1">IMC</p>
              <p className="text-2xl font-bold font-mono" style={{ color: bmiInfo.color }}>{bmi.toFixed(1)}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: bmiInfo.color }}>{bmiInfo.label}</p>
              <div className="mt-2 h-1.5 bg-[#162236] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((bmi / 40) * 100, 100)}%`, backgroundColor: bmiInfo.color }} />
              </div>
              <div className="flex justify-between text-xs text-[#6B7A8D] mt-1">
                <span>18.5</span><span>25</span><span>30</span><span>40+</span>
              </div>
            </div>
          )}

          <Button onClick={saveProfile} disabled={saving} className="w-full btn-gold text-[#0D1B2A] font-bold text-sm h-9">
            <Save className="h-3.5 w-3.5 mr-2" /> {saving ? "Salvando..." : "Salvar ficha"}
          </Button>
        </div>

        {/* Planner semanal */}
        <div className="md:col-span-2 bg-[#1A2B42] rounded-xl p-5 border border-[#162236] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest">Planner Semanal</h3>

          {/* Day tabs */}
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => setActiveDay(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDay === i ? "bg-[#C9A84C] text-[#0D1B2A]" : "bg-[#162236] text-[#A89880] hover:text-[#F0EBE3]"}`}
              >
                {day}
                {days[i] && days[i]!.exercises.length > 0 && (
                  <span className={`ml-1.5 px-1 rounded-full text-xs ${activeDay === i ? "bg-[#0D1B2A]/20" : "bg-[#C9A84C]/20 text-[#C9A84C]"}`}>
                    {days[i]!.exercises.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Exercises list */}
          <div className="space-y-2 min-h-24">
            {currentDay.exercises.length === 0 ? (
              <p className="text-sm text-[#6B7A8D] text-center py-6">Nenhum exercício para {DAYS[activeDay]}. Adicione abaixo.</p>
            ) : (
              currentDay.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#162236] group">
                  <Dumbbell className="h-4 w-4 text-[#C9A84C] shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[#F0EBE3] font-medium">{ex.name}</p>
                    <p className="text-xs text-[#6B7A8D]">{ex.sets} séries × {ex.reps} repetições</p>
                  </div>
                  <button onClick={() => removeExercise(ex.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7A8D] hover:text-[#E53E3E] transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add exercise */}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-[#162236]">
            <Input
              value={newExercise.name}
              onChange={(e) => setNewExercise(f => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
              placeholder="Exercício..."
              className="flex-1 bg-[#162236] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] h-9 text-sm focus-visible:ring-[#C9A84C] min-w-32"
            />
            <Input value={newExercise.sets} onChange={(e) => setNewExercise(f => ({ ...f, sets: e.target.value }))} placeholder="Séries" type="number" className="w-20 bg-[#162236] border-[#1A2B42] text-[#F0EBE3] h-9 text-sm focus-visible:ring-[#C9A84C]" />
            <Input value={newExercise.reps} onChange={(e) => setNewExercise(f => ({ ...f, reps: e.target.value }))} placeholder="Reps" type="number" className="w-20 bg-[#162236] border-[#1A2B42] text-[#F0EBE3] h-9 text-sm focus-visible:ring-[#C9A84C]" />
            <Button onClick={addExercise} className="btn-gold text-[#0D1B2A] font-bold h-9 px-4">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
