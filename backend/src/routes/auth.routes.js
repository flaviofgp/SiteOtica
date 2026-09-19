const { Router } = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");

const router = Router();

router.post("/signup", asyncHandler(ctrl.signup));
router.post("/login", asyncHandler(ctrl.login));
router.get("/me", requireAuth, asyncHandler(ctrl.me));

module.exports = router;
