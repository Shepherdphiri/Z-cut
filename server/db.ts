import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'zcut.sqlite');

let dbInstance: Database | null = null;

// Initialize SQL Schema and Seed lightweight data
function initializeSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      movie_url TEXT NOT NULL,
      thumbnail_url TEXT,
      duration_formatted TEXT,
      duration_seconds INTEGER,
      genre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      hook_text TEXT,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      duration REAL NOT NULL,
      viral_score INTEGER DEFAULT 90,
      framing_mode TEXT DEFAULT 'speaker_tracking',
      primary_subject TEXT,
      zoom_factor REAL DEFAULT 1.15,
      panning_trajectory TEXT, -- JSON array of keyframes
      dialogue TEXT,           -- JSON array of dialogue lines
      social_caption TEXT,
      hashtags TEXT,           -- JSON array of strings
      recommended_audio_vibe TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL UNIQUE,
      account_handle TEXT NOT NULL,
      status TEXT DEFAULT 'connected',
      webhook_url TEXT,
      access_token TEXT,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      clip_id TEXT,
      platform TEXT NOT NULL,
      caption TEXT NOT NULL,
      hashtags TEXT,
      scheduled_time TEXT,
      status TEXT DEFAULT 'published',
      direct_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      hook_enabled INTEGER DEFAULT 1,
      hook_text TEXT,
      hook_duration REAL DEFAULT 3.0,
      progress_bar_color TEXT DEFAULT '#E11D48',
      watermark_text TEXT DEFAULT '@zcut_creator',
      color_grade TEXT DEFAULT 'none'
    );
  `);

  // Seed default social accounts if empty
  const accountCount = db.exec("SELECT COUNT(*) as count FROM social_accounts")[0]?.values[0][0];
  if (!accountCount || accountCount === 0) {
    db.run(`
      INSERT INTO social_accounts (id, platform, account_handle, status, webhook_url) VALUES
      ('sa_tiktok', 'tiktok', '@zcut_creator', 'connected', 'https://api.tiktok.com/v2/post/publish/video/init/'),
      ('sa_instagram', 'instagram', '@zcut_reels', 'connected', 'https://graph.instagram.com/v19.0/me/media'),
      ('sa_youtube', 'youtube_shorts', 'Z-Cut Studio', 'connected', 'https://www.googleapis.com/youtube/v3/videos'),
      ('sa_x', 'twitter', '@ZCutVideo', 'connected', 'https://api.twitter.com/2/tweets');
    `);
  }

  // Seed default templates if empty
  const tplCount = db.exec("SELECT COUNT(*) as count FROM templates")[0]?.values[0][0];
  if (!tplCount || tplCount === 0) {
    db.run(`
      INSERT INTO templates (id, name, hook_enabled, hook_text, hook_duration, progress_bar_color, watermark_text, color_grade) VALUES
      ('tpl_standard', 'Standard Clean', 1, 'WAIT FOR IT...', 3.0, '#E11D48', '@zcut_creator', 'none'),
      ('tpl_cinematic', 'Cinema Master', 1, 'PART 1 / 3', 2.5, '#3B82F6', 'Z-CUT CINEMA', 'cinematic_teal'),
      ('tpl_minimal', 'Minimalist', 0, '', 2.0, '#10B981', '', 'none');
    `);
  }
}

export async function getSqlDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not load existing SQL file, creating fresh DB:', e);
      dbInstance = new SQL.Database();
      initializeSchema(dbInstance);
      persistDb();
    }
  } else {
    dbInstance = new SQL.Database();
    initializeSchema(dbInstance);
    persistDb();
  }

  return dbInstance;
}

export function persistDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error persisting SQLite database:', err);
  }
}
