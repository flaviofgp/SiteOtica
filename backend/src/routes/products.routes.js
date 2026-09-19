const { Router } = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const ctrl = require("../controllers/products.controller");

const router = Router();

// Público
router.get("/", asyncHandler(ctrl.list));
router.get("/:id", asyncHandler(ctrl.getById));

// Admin
router.post("/", requireAuth, requireAdmin, asyncHandler(ctrl.create));
router.put("/:id", requireAuth, requireAdmin, asyncHandler(ctrl.update));
router.delete("/:id", requireAuth, requireAdmin, asyncHandler(ctrl.remove));

module.exports = router;
