import { createBrowserRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm";

export const router = createBrowserRouter([{ path: "/login", element: LoginForm }]);
