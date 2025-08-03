import express from "express";
import pool from "../db/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { verifyToken } from "../middleware/auth.js";

dotenv.config();
const router = express.Router();

const genToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};


// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ msg: "ไม่พบ Email" });
        }
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ msg: "Password ไม่ถูกต้อง" });
        }
        const token = genToken(user.rows[0]);

        // บันทึก login log และตั้งสถานะเป็น online
        await pool.query(
            "INSERT INTO login_logs (email, login_time, status) VALUES ($1, NOW(), $2)",
            [email, "online"]
        );

        res.json({ msg: "เข้าสู่ระบบสำเร็จ", token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: "Server Error " + err });
    }
});

// Logout
router.post("/logout", verifyToken, async (req, res) => {
    const email = req.user.email;
    try {
        // อัปเดตสถานะล่าสุดเป็น offline
        await pool.query(
            "UPDATE login_logs SET status = $1 WHERE email = $2 AND id = (SELECT id FROM login_logs WHERE email = $2 ORDER BY login_time DESC LIMIT 1)",
            ["offline", email]
        );
        res.json({ msg: "ออกจากระบบสำเร็จ" });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: "Server Error " + err });
    }
});

// แสดงโปรไฟล์ member (Protected Route)
router.get("/", verifyToken, async (req, res) => {
    const userid = req.user.id;
    try {
        const user = await pool.query("SELECT id, name, email, created_at FROM users WHERE id = $1", [userid]);
        res.json(user.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
    }
});

router.post("/", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        console.log('Request body:', req.body);
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.json({ msg: "Email นี้มีการใช้งานแล้ว" });
        }
        const hashedPass = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING name, email",
            [name, email, hashedPass]
        );
        console.log('New user created:', newUser.rows[0]);
        res.status(201).json({ msg: "สมัครสมาชิกสำเร็จ", user: newUser.rows[0] });
    } catch (err) {
        console.error('User registration error:', err);
        res.status(500).json({ error: "Server Error: " + err });
    }
});



// ดึง login logs
router.get("/login-logs", verifyToken, async (req, res) => {
    try {
        const logs = await pool.query(
            "SELECT email, login_time, status FROM login_logs WHERE email = $1 ORDER BY login_time DESC",
            [req.user.email]
        );
        res.json(logs.rows);
    } catch (err) {
        console.error('Login logs error:', err);
        res.status(500).json({ error: "Server Error " + err });
    }
});

// ดึงข้อมูล water_quality 8 ตัวล่าสุด
router.get("/water-quality", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM water_quality ORDER BY recorded_at DESC LIMIT 8"
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Water quality fetch error:', err);
        res.status(500).json({ error: "Server Error " + err });
    }
});



export default router;