import express from "express";
import { setupUserRoutes } from "./routes";

const app = express();
app.use(express.json());
setupUserRoutes(app);

app.listen(3002, () => {
    console.log("User service running on 3002");
});
