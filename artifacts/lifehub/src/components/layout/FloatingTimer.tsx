import { useEffect } from "react";
import { useTimerStore } from "@/store/timerStore";
import { useGetTask, usePauseTask, useStopTask, useExecuteTask } from "@workspace/api-client-react";
import { Play, Pause, Square, Timer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTasksQueryKey, getGetTaskQueryKey } from "@workspace/api-client-react";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FloatingTimer() {
  const { activeTaskId, elapsedSeconds, isPaused, tick, setPaused, reset, resetLocal } = useTimerStore();
  const qc = useQueryClient();

  const { data: task } = useGetTask(activeTaskId || "", {
    query: { enabled: !!activeTaskId, queryKey: getGetTaskQueryKey(activeTaskId || "") }
  });

  const pauseTaskMutation = usePauseTask();
  const stopTaskMutation = useStopTask();
  const executeTaskMutation = useExecuteTask();

  useEffect(() => {
    if (!activeTaskId) return;
    const interval = setInterval(() => { tick(); }, 1000);
    return () => clearInterval(interval);
  }, [activeTaskId, tick]);

  if (!activeTaskId || !task) return null;

  const handlePauseToggle = () => {
    if (!isPaused) {
      pauseTaskMutation.mutate({ id: activeTaskId }, {
        onSuccess: () => {
          setPaused(true);
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTaskQueryKey(activeTaskId) });
        }
      });
    } else {
      executeTaskMutation.mutate({ id: activeTaskId }, {
        onSuccess: (res) => {
          setPaused(false);
          useTimerStore.getState().setActive(activeTaskId, res.session.id);
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        }
      });
    }
  };

  const handleStop = () => {
    stopTaskMutation.mutate({ id: activeTaskId }, {
      onSuccess: () => {
        reset();
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      }
    });
  };

  const handleReset = () => {
    resetLocal();
  };

  return (
    <div className="fixed bottom-6 right-6 bg-[#162236] border border-[#C9A84C] shadow-2xl shadow-black/50 rounded-xl p-4 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A2B42] text-[#C9A84C]">
        <Timer className="h-5 w-5" />
      </div>
      
      <div className="min-w-0 max-w-[180px]">
        <p className="text-xs text-[#A89880] font-medium mb-1 truncate">
          {task.project ? `${task.project.name} / ` : ''}{task.title}
        </p>
        <p className={`text-2xl font-mono font-bold leading-none tracking-tight ${isPaused ? 'text-[#ED8936]' : 'text-[#C9A84C]'}`}>
          {formatTime(elapsedSeconds)}
        </p>
        {isPaused && <p className="text-xs text-[#ED8936] mt-0.5">Pausado</p>}
      </div>

      <div className="flex items-center gap-1 pl-4 border-l border-[#1A2B42]">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[#F0EBE3] hover:text-[#C9A84C] hover:bg-[#1A2B42]"
          onClick={handlePauseToggle}
          disabled={pauseTaskMutation.isPending || executeTaskMutation.isPending}
          title={isPaused ? "Retomar" : "Pausar"}
        >
          {isPaused ? <Play className="h-4 w-4" fill="currentColor" /> : <Pause className="h-4 w-4" fill="currentColor" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[#A89880] hover:text-[#F0EBE3] hover:bg-[#1A2B42]"
          onClick={handleReset}
          title="Reiniciar contagem"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[#E53E3E] hover:text-[#E53E3E] hover:bg-[#1A2B42]"
          onClick={handleStop}
          disabled={stopTaskMutation.isPending}
          title="Parar e salvar sessão"
        >
          <Square className="h-4 w-4" fill="currentColor" />
        </Button>
      </div>
    </div>
  );
}
