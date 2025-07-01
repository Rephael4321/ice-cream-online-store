"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJWT = createJWT;
exports.verifyJWT = verifyJWT;
var jsonwebtoken_1 = require("jsonwebtoken");
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
function createJWT(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "4h" });
}
function verifyJWT(token) {
    try {
        var decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return typeof decoded === "string" ? null : decoded;
    }
    catch (_a) {
        return null;
    }
}
