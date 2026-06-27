import express from "express";
import { setupAuthRoutes } from "./routes";

const app = express();
app.use(express.json());
setupAuthRoutes(app);

app.listen(3001, () => {
    console.log("Auth service running on 3001");
});
