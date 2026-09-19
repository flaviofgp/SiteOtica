const { Router } = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const ctrl = require("../controllers/orders.controller");

const router = Router();

router.post("/", requireAuth, asyncHandler(ctrl.create));
router.get("/me", requireAuth, asyncHandler(ctrl.listMine));
router.post("/:id/confirm-pix", requireAuth, asyncHandler(ctrl.confirmPixMock));

// Admin
router.get("/", requireAuth, requireAdmin, asyncHandler(ctrl.listAll));
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(ctrl.updateStatus));

module.exports = router;
