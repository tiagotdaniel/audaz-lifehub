import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, Dumbbell, Scale, Save, Target, Calculator, CalendarDays, Droplet, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Exercise { id: string; name: string; sets: number; reps: number; }
interface WorkoutDay { dayOfWeek: number; exercises: Exercise[]; }
interface ShapeProfile { age?: number; heightCm?: number; weightKg?: number; goalWeightKg?: number; goalDate?: string; }
interface Food { name: string; kcal: number; carbsG: number; proteinG: number; fatG: number; sugarG: number; }
interface FitnessLog {
  date: string; trainedMinutes: number; kcal: number; carbsG: number; proteinG: number; fatG: number; sugarG: number; waterMl: number;
}

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const EMPTY_LOG: Omit<FitnessLog, "date"> = { trainedMinutes: 0, kcal: 0, carbsG: 0, proteinG: 0, fatG: 0, sugarG: 0, waterMl: 0 };

function calcBMI(height: number, weight: number) {
  const hm = height / 100;
  return weight / (hm * hm);
}

function bmiStatus(bmi: number) {
  if (bmi < 16 || bmi >= 30) return { label: bmi < 16 ? "Abaixo do peso" : "Obesidade", color: "#E53E3E" };
  if (bmi < 18.5 || bmi >= 25) return { label: bmi < 18.5 ? "Levemente abaixo" : "Sobrepeso", color: "#ECC94B" };
  return { label: "Peso ideal", color: "#38A169" };
}

export default function Shape() {
  const { getToken } = useAuth();
  const [days, setDays] = useState<WorkoutDay[]>(Array.from({ length: 6 }, (_, i) => ({ dayOfWeek: i, exercises: [] })));
  const [profile, setProfile] = useState<ShapeProfile>({});
  const [profileForm, setProfileForm] = useState({ age: "", height: "", weight: "", goalWeight: "", goalDate: "" });
  const [activeDay, setActiveDay] = useState(0);
  const [newExercise, setNewExercise] = useState({ name: "", sets: "3", reps: "12" });
  const [saving, setSaving] = useState(false);

  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [portions, setPortions] = useState("1");

  const [logs, setLogs] = useState<Record<string, FitnessLog>>({});
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dayForm, setDayForm] = useState(EMPTY_LOG);
  const [savingLog, setSavingLog] = useState(false);

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    return res.json();
  };

  useEffect(() => {
    Promise.all([
      authFetch("/api/workout/days"),
      authFetch("/api/workout/profile"),
      authFetch("/api/workout/foods"),
      authFetch("/api/workout/fitness-log"),
    ]).then(([d, p, f, l]) => {
      if (Array.isArray(d) && d.length > 0) {
        setDays(prev => prev.map(day => {
          const found = d.find((x: WorkoutDay) => x.dayOfWeek === day.dayOfWeek);
          return found ? { ...day, exercises: (found.exercises as Exercise[]) || [] } : day;
        }));
      }
      if (p) {
        setProfile(p);
        setProfileForm({
          age: p.age?.toString() ?? "",
          height: p.heightCm?.toString() ?? "",
          weight: p.weightKg?.toString() ?? "",
          goalWeight: p.goalWeightKg?.toString() ?? "",
          goalDate: p.goalDate ?? "",
        });
      }
      if (Array.isArray(f)) setFoods(f);
      if (Array.isArray(l)) {
        const map: Record<string, FitnessLog> = {};
        for (const log of l) map[log.date] = log;
        setLogs(map);
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
      body: JSON.stringify({
        age: parseInt(profileForm.age),
        heightCm: parseFloat(profileForm.height),
        weightKg: parseFloat(profileForm.weight),
        goalWeightKg: profileForm.goalWeight ? parseFloat(profileForm.goalWeight) : null,
        goalDate: profileForm.goalDate || null,
      }),
    });
    setProfile(p);
    setSaving(false);
  };

  const bmi = profile.heightCm && profile.weightKg ? calcBMI(profile.heightCm, profile.weightKg) : null;
  const bmiInfo = bmi ? bmiStatus(bmi) : null;
  const currentDay = days[activeDay]!;

  // Kcal calculator
  const selectedFoodData = foods.find(f => f.name === selectedFood);
  const portionCount = parseFloat(portions) || 0;
  const calcResult = selectedFoodData ? {
    kcal: selectedFoodData.kcal * portionCount,
    carbsG: selectedFoodData.carbsG * portionCount,
    proteinG: selectedFoodData.proteinG * portionCount,
    fatG: selectedFoodData.fatG * portionCount,
    sugarG: selectedFoodData.sugarG * portionCount,
  } : null;

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const addToToday = async () => {
    if (!calcResult) return;
    const existing = logs[todayKey] ?? { date: todayKey, ...EMPTY_LOG };
    const updated: FitnessLog = {
      ...existing,
      kcal: existing.kcal + calcResult.kcal,
      carbsG: existing.carbsG + calcResult.carbsG,
      proteinG: existing.proteinG + calcResult.proteinG,
      fatG: existing.fatG + calcResult.fatG,
      sugarG: existing.sugarG + calcResult.sugarG,
    };
    const saved = await authFetch(`/api/workout/fitness-log/${todayKey}`, { method: "PUT", body: JSON.stringify(updated) });
    setLogs(prev => ({ ...prev, [todayKey]: saved }));
    setSelectedFood("");
    setPortions("1");
  };

  // Calendar
  const monthDays = useMemo(() => {
    const start = startOfMonth(calMonth);
    const end = endOfMonth(calMonth);
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const leadingBlanks = getDay(startOfMonth(calMonth));

  const openDay = (dateKey: string) => {
    setSelectedDate(dateKey);
    setDayForm(logs[dateKey] ? { ...logs[dateKey] } : { ...EMPTY_LOG });
  };

  const saveDayLog = async () => {
    setSavingLog(true);
    const saved = await authFetch(`/api/workout/fitness-log/${selectedDate}`, { method: "PUT", body: JSON.stringify(dayForm) });
    setLogs(prev => ({ ...prev, [selectedDate]: saved }));
    setSavingLog(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1 flex items-center gap-3">
          <Dumbbell className="h-7 w-7 text-[#C9A84C]" /> Shape
        </h1>
        <p className="text-[var(--text-muted)] text-sm">Planner de treinos semanais e ficha corporal</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Ficha corporal */}
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <Scale className="h-3.5 w-3.5" /> Ficha corporal
          </h3>
          <div className="space-y-3">
            {[["Idade (anos)", "age"], ["Altura (cm)", "height"], ["Peso (kg)", "weight"]].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">{label}</label>
                <Input
                  type="number"
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={(e) => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                  className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C] h-9 text-sm"
                />
              </div>
            ))}
          </div>

          {bmi && bmiInfo && (
            <div className="p-3 rounded-lg border" style={{ borderColor: bmiInfo.color + "40", backgroundColor: bmiInfo.color + "11" }}>
              <p className="text-xs text-[var(--text-muted)] mb-1">IMC</p>
              <p className="text-2xl font-bold font-mono" style={{ color: bmiInfo.color }}>{bmi.toFixed(1)}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: bmiInfo.color }}>{bmiInfo.label}</p>
              <div className="mt-2 h-1.5 bg-[var(--surface-1)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((bmi / 40) * 100, 100)}%`, backgroundColor: bmiInfo.color }} />
              </div>
              <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
                <span>16</span><span>18.5</span><span>25</span><span>30+</span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--surface-1)] space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <Target className="h-3.5 w-3.5" /> Meta de peso
            </h4>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1 block">Peso alvo (kg)</label>
              <Input
                type="number"
                value={profileForm.goalWeight}
                onChange={(e) => setProfileForm(f => ({ ...f, goalWeight: e.target.value }))}
                className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C] h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1 block">Data alvo</label>
              <Input
                type="date"
                value={profileForm.goalDate}
                onChange={(e) => setProfileForm(f => ({ ...f, goalDate: e.target.value }))}
                className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C] h-9 text-sm"
              />
            </div>
            {profile.goalWeightKg && profile.weightKg && (
              <p className="text-xs text-[var(--text-muted)]">
                Faltam <span className="text-[#C9A84C] font-bold">{Math.abs(profile.weightKg - profile.goalWeightKg).toFixed(1)}kg</span> para a meta.
              </p>
            )}
          </div>

          <Button onClick={saveProfile} disabled={saving} className="w-full btn-gold text-[var(--surface-0)] font-bold text-sm h-9">
            <Save className="h-3.5 w-3.5 mr-2" /> {saving ? "Salvando..." : "Salvar ficha"}
          </Button>
        </div>

        {/* Planner semanal */}
        <div className="md:col-span-2 bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Planner Semanal</h3>

          {/* Day tabs */}
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => setActiveDay(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDay === i ? "bg-[#C9A84C] text-[var(--surface-0)]" : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                {day}
                {days[i] && days[i]!.exercises.length > 0 && (
                  <span className={`ml-1.5 px-1 rounded-full text-xs ${activeDay === i ? "bg-[var(--surface-0)]/20" : "bg-[#C9A84C]/20 text-[#C9A84C]"}`}>
                    {days[i]!.exercises.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Exercises list */}
          <div className="space-y-2 min-h-24">
            {currentDay.exercises.length === 0 ? (
              <p className="text-sm text-[var(--text-subtle)] text-center py-6">Nenhum exercício para {DAYS[activeDay]}. Adicione abaixo.</p>
            ) : (
              currentDay.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)] group">
                  <Dumbbell className="h-4 w-4 text-[#C9A84C] shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)] font-medium">{ex.name}</p>
                    <p className="text-xs text-[var(--text-subtle)]">{ex.sets} séries × {ex.reps} repetições</p>
                  </div>
                  <button onClick={() => removeExercise(ex.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-subtle)] hover:text-[#E53E3E] transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add exercise */}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-[var(--surface-1)]">
            <Input
              value={newExercise.name}
              onChange={(e) => setNewExercise(f => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
              placeholder="Exercício..."
              className="flex-1 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] h-9 text-sm focus-visible:ring-[#C9A84C] min-w-32"
            />
            <Input value={newExercise.sets} onChange={(e) => setNewExercise(f => ({ ...f, sets: e.target.value }))} placeholder="Séries" type="number" className="w-20 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm focus-visible:ring-[#C9A84C]" />
            <Input value={newExercise.reps} onChange={(e) => setNewExercise(f => ({ ...f, reps: e.target.value }))} placeholder="Reps" type="number" className="w-20 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm focus-visible:ring-[#C9A84C]" />
            <Button onClick={addExercise} className="btn-gold text-[var(--surface-0)] font-bold h-9 px-4">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Calculadora de kcal */}
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <Calculator className="h-3.5 w-3.5" /> Calculadora de Kcal
          </h3>
          <Select value={selectedFood} onValueChange={setSelectedFood}>
            <SelectTrigger className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm">
              <SelectValue placeholder="Escolha um alimento" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--surface-1)] border-[var(--surface-2)]">
              {foods.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-[var(--text-subtle)] mb-1 block">Porções</label>
            <Input type="number" step="0.5" value={portions} onChange={(e) => setPortions(e.target.value)} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm" />
          </div>
          {calcResult && (
            <div className="p-3 rounded-lg bg-[var(--surface-1)] space-y-1 text-sm">
              <p className="text-[#C9A84C] font-bold font-mono">{calcResult.kcal.toFixed(0)} kcal</p>
              <p className="text-xs text-[var(--text-muted)]">Carb {calcResult.carbsG.toFixed(1)}g · Prot {calcResult.proteinG.toFixed(1)}g · Gord {calcResult.fatG.toFixed(1)}g · Açúcar {calcResult.sugarG.toFixed(1)}g</p>
            </div>
          )}
          <Button onClick={addToToday} disabled={!calcResult} className="w-full btn-gold text-[var(--surface-0)] font-bold text-sm h-9">
            <Plus className="h-3.5 w-3.5 mr-2" /> Adicionar ao dia de hoje
          </Button>
        </div>

        {/* Calendário fitness */}
        <div className="md:col-span-2 bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] card-depth space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" /> Calendário Fitness
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="px-2 text-[var(--text-muted)] hover:text-[#C9A84C]">‹</button>
              <span className="text-[var(--text-primary)] font-medium capitalize w-32 text-center">{format(calMonth, "MMMM yyyy", { locale: ptBR })}</span>
              <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="px-2 text-[var(--text-muted)] hover:text-[#C9A84C]">›</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={i} className="text-xs text-[var(--text-subtle)] font-semibold">{d}</span>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
            {monthDays.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const log = logs[key];
              const hasData = log && (log.trainedMinutes > 0 || log.kcal > 0);
              const isSelected = key === selectedDate;
              return (
                <button
                  key={key}
                  onClick={() => openDay(key)}
                  className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition-all border ${
                    isSelected ? "border-[#C9A84C] bg-[#C9A84C]/10" : "border-transparent hover:border-[#C9A84C]/40"
                  } ${isSameDay(d, new Date()) ? "ring-1 ring-[#C9A84C]/50" : ""}`}
                  style={{ backgroundColor: !isSelected && hasData ? "#C9A84C22" : undefined }}
                >
                  <span className="text-[var(--text-primary)]">{format(d, "d")}</span>
                  {hasData && (
                    <span className="flex gap-0.5">
                      {log!.trainedMinutes > 0 && <Dumbbell className="h-2.5 w-2.5 text-[#38A169]" />}
                      {log!.kcal > 0 && <Flame className="h-2.5 w-2.5 text-[#ED8936]" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day editor */}
          <div className="pt-3 border-t border-[var(--surface-1)] space-y-3">
            <p className="text-sm text-[var(--text-primary)] font-medium">{format(new Date(selectedDate + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">Treino (min)</label>
                <Input type="number" value={dayForm.trainedMinutes} onChange={(e) => setDayForm(f => ({ ...f, trainedMinutes: parseInt(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">Kcal</label>
                <Input type="number" value={dayForm.kcal} onChange={(e) => setDayForm(f => ({ ...f, kcal: parseFloat(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1 flex items-center gap-1"><Droplet className="h-2.5 w-2.5" /> Água (ml)</label>
                <Input type="number" value={dayForm.waterMl} onChange={(e) => setDayForm(f => ({ ...f, waterMl: parseFloat(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">Carboidrato (g)</label>
                <Input type="number" value={dayForm.carbsG} onChange={(e) => setDayForm(f => ({ ...f, carbsG: parseFloat(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">Proteína (g)</label>
                <Input type="number" value={dayForm.proteinG} onChange={(e) => setDayForm(f => ({ ...f, proteinG: parseFloat(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">Gordura (g)</label>
                <Input type="number" value={dayForm.fatG} onChange={(e) => setDayForm(f => ({ ...f, fatG: parseFloat(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-[var(--text-subtle)] mb-1 block">Açúcar (g)</label>
                <Input type="number" value={dayForm.sugarG} onChange={(e) => setDayForm(f => ({ ...f, sugarG: parseFloat(e.target.value) || 0 }))} className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
              </div>
            </div>
            <Button onClick={saveDayLog} disabled={savingLog} className="w-full btn-gold text-[var(--surface-0)] font-bold text-sm h-9">
              <Save className="h-3.5 w-3.5 mr-2" /> {savingLog ? "Salvando..." : "Salvar dia"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
