import express from "express";

import { hashtagsRouter } from "./routes/hashtags";

const app = express();

app.use(express.json());
app.use("/hashtags", hashtagsRouter);

export { app };
