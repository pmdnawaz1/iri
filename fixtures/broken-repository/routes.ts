import express from "express";

const router = express.Router();

// DELIBERATELY BROKEN: this handler never calls AuthService or any controller.
// It handles the route inline without delegating to the service layer.
router.post("/login", (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  // Broken: should call authService.login but instead returns a stub response.
  res.json({ token: "stub-token" });
});

export default router;
