import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("mandarina.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    avatar TEXT DEFAULT 'default-avatar.png',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    video_path TEXT,
    price REAL,
    views INTEGER DEFAULT 0,
    genres TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    video_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    video_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
  );
`);

// Seed some data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("admin", "admin123");
  db.prepare("INSERT INTO videos (user_id, title, video_path, price, genres) VALUES (?, ?, ?, ?, ?)").run(
    1, 
    "Summer Vibes", 
    "https://www.w3schools.com/html/mov_bbb.mp4", 
    15.00, 
    "Pop, Rock"
  );
  db.prepare("INSERT INTO videos (user_id, title, video_path, price, genres) VALUES (?, ?, ?, ?, ?)").run(
    1, 
    "Jazz Night", 
    "https://www.w3schools.com/html/movie.mp4", 
    20.00, 
    "Jazz, Soul"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/videos", (req, res) => {
    const { search, genres } = req.query;
    let query = `
      SELECT videos.*, users.username, users.avatar 
      FROM videos 
      JOIN users ON videos.user_id = users.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += " AND videos.title LIKE ?";
      params.push(`%${search}%`);
    }

    if (genres) {
      const genreList = (genres as string).split(",");
      const genreConditions = genreList.map(() => "videos.genres LIKE ?").join(" OR ");
      query += ` AND (${genreConditions})`;
      genreList.forEach(g => params.push(`%${g.trim()}%`));
    }

    query += " ORDER BY videos.created_at DESC";
    const videos = db.prepare(query).all(...params);
    res.json(videos);
  });

  app.post("/api/videos/:id/view", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE videos SET views = views + 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/reserve", (req, res) => {
    const { video_id, user_id } = req.body;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    db.prepare("INSERT INTO reservations (user_id, video_id) VALUES (?, ?)").run(user_id, video_id);
    res.json({ success: true });
  });

  app.post("/api/playlist", (req, res) => {
    const { video_id, user_id } = req.body;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    db.prepare("INSERT INTO playlists (user_id, video_id) VALUES (?, ?)").run(user_id, video_id);
    res.json({ success: true });
  });

  app.get("/api/playlist/:userId", (req, res) => {
    const { userId } = req.params;
    const playlist = db.prepare(`
      SELECT videos.* FROM videos 
      JOIN playlists ON videos.id = playlists.video_id 
      WHERE playlists.user_id = ?
    `).all(userId);
    res.json(playlist);
  });

  // Simple Auth (Mock for demo)
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, avatar: user.avatar });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
