import { Router } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import tasksRouter from "./tasks";
import sectorsRouter from "./sectors";
import projectsRouter from "./projects";
import goalsRouter from "./goals";
import milestonesRouter from "./milestones";
import statsRouter from "./stats";

const router = Router();

router.use("/healthz", healthRouter);
router.use("/me", meRouter);
router.use("/tasks", tasksRouter);
router.use("/sectors", sectorsRouter);
router.use("/projects", projectsRouter);
router.use("/goals", goalsRouter);
router.use("/milestones", milestonesRouter);
router.use("/stats", statsRouter);

export default router;
