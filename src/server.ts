import "dotenv/config";

import { app } from "./app";
import { startRecentMediaCron } from "./cron/recentMedia";

const PORT = Number(process.env.PORT ?? 3000);

startRecentMediaCron();

app.listen(PORT, () => {
  console.info(`[server] Listening on port ${PORT}`);
});
