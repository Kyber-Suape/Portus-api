import { Router } from "express";
import { authRouter } from "./auth/auth.routes";
import { organizationsRouter } from "./organizations/organizations.routes";
import { usersRouter } from "./users/users.routes";
import { permissionsRouter } from "./permissions/permissions.routes";
import { aiRouter } from "./ai/ai.routes";
import { dashboardRouter } from "./dashboard/dashboard.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/organizations", organizationsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/dashboard", dashboardRouter);
// Sem prefixo próprio: já expõe os caminhos completos (/permissions, /roles/:role/permissions, /users/:id/permissions).
apiRouter.use(permissionsRouter);
