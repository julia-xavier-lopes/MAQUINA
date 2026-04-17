import { Router, type IRouter } from "express";
import healthRouter from "./health";
import equipmentRouter from "./equipment";
import analysisRouter from "./analysis";
import dashboardRouter from "./dashboard";
import chatRouter from "./chat";
import reportsRouter from "./reports";
import emissionsRouter from "./emissions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(equipmentRouter);
router.use(analysisRouter);
router.use(dashboardRouter);
router.use(chatRouter);
router.use(reportsRouter);
router.use(emissionsRouter);

export default router;
