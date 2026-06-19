import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Portus API rodando em http://localhost:${env.PORT}`);
  console.log(`Swagger disponível em http://localhost:${env.PORT}/api/docs`);
});
