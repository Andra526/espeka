import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.resolve(__dirname, '../../database.sqlite');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisify database operations
export const dbQuery = {
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export async function initDatabase() {
  console.log('Initializing database tables...');

  // Create Tenants table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      email TEXT,
      phone TEXT,
      address TEXT,
      subscription_status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Users table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('super_admin', 'tenant_admin', 'student')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    )
  `);

  // Create Lecturers table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS lecturers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      nidn TEXT UNIQUE,
      email TEXT,
      department TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create Criteria table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS criteria (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('benefit', 'cost')) NOT NULL,
      default_weight REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create Lecturer Criteria Values table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS lecturer_criteria_values (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lecturer_id TEXT NOT NULL,
      criteria_id TEXT NOT NULL,
      value REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE,
      UNIQUE(lecturer_id, criteria_id)
    )
  `);

  // Create Recommendation Requests table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS recommendation_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      department TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Recommendation Request Weights table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS recommendation_request_weights (
      id TEXT PRIMARY KEY,
      recommendation_request_id TEXT NOT NULL,
      criteria_id TEXT NOT NULL,
      weight REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recommendation_request_id) REFERENCES recommendation_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE
    )
  `);

  // Create Recommendation Results table
  await dbQuery.run(`
    CREATE TABLE IF NOT EXISTS recommendation_results (
      id TEXT PRIMARY KEY,
      recommendation_request_id TEXT NOT NULL,
      lecturer_id TEXT NOT NULL,
      final_score REAL NOT NULL,
      rank_position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recommendation_request_id) REFERENCES recommendation_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables created successfully.');
  await seedDatabase();
}

async function seedDatabase() {
  // Check if seeding is needed (based on users table empty)
  const userCount = await dbQuery.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding initial data...');

  const tenantFtiId = uuidv4();
  const tenantFebId = uuidv4();

  // 1. Seed Tenants (Representing Fakultas / Jurusan)
  await dbQuery.run(
    `INSERT INTO tenants (id, name, slug, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantFtiId, 'Fakultas Teknologi Informasi', 'fti', 'fti@university.ac.id', '021-778899', 'Gedung A, Kampus Utama']
  );
  await dbQuery.run(
    `INSERT INTO tenants (id, name, slug, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantFebId, 'Fakultas Ekonomi dan Bisnis', 'feb', 'feb@university.ac.id', '021-778800', 'Gedung B, Kampus Utama']
  );

  // 2. Seed Users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Super Admin
  await dbQuery.run(
    `INSERT INTO users (id, tenant_id, name, email, password, role) VALUES (?, NULL, ?, ?, ?, ?)`,
    [uuidv4(), 'Super Admin Universitas', 'superadmin.lecrank@gmail.com', hashedPassword, 'super_admin']
  );
  // FTI Admin
  await dbQuery.run(
    `INSERT INTO users (id, tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), tenantFtiId, 'Admin FTI', 'admin.fti.lecrank@gmail.com', hashedPassword, 'tenant_admin']
  );
  // FEB Admin
  await dbQuery.run(
    `INSERT INTO users (id, tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), tenantFebId, 'Admin FEB', 'admin.feb.lecrank@gmail.com', hashedPassword, 'tenant_admin']
  );
  // Student FTI
  const studentId = uuidv4();
  await dbQuery.run(
    `INSERT INTO users (id, tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [studentId, tenantFtiId, 'Mahasiswa FTI (Budi)', 'mahasiswa.fti@gmail.com', hashedPassword, 'student']
  );

  // 3. Seed Criteria C1-C5 for both FTI and FEB
  const criteriaData = [
    { code: 'C1', name: 'Lama Mengabdi', type: 'benefit', default_weight: 25, description: 'Lama mengajar dalam tahun' },
    { code: 'C2', name: 'Cara Mengajar', type: 'benefit', default_weight: 25, description: 'Skor evaluasi proses pembelajaran (1-100)' },
    { code: 'C3', name: 'Ketepatan Waktu Hadir', type: 'benefit', default_weight: 15, description: 'Persentase kehadiran tepat waktu (1-100)' },
    { code: 'C4', name: 'Tingkat Keramahan', type: 'benefit', default_weight: 20, description: 'Evaluasi keramahan dan interaksi (1-5)' },
    { code: 'C5', name: 'Pemberian Tugas', type: 'cost', default_weight: 10, description: 'Beban pemberian tugas per semester (1-10, lower is better)' }
  ];

  const criteriaMapFTI: { [key: string]: string } = {};
  const criteriaMapFEB: { [key: string]: string } = {};

  for (const item of criteriaData) {
    const ftiCritId = uuidv4();
    await dbQuery.run(
      `INSERT INTO criteria (id, tenant_id, code, name, type, default_weight, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ftiCritId, tenantFtiId, item.code, item.name, item.type, item.default_weight, item.description]
    );
    criteriaMapFTI[item.code] = ftiCritId;

    const febCritId = uuidv4();
    await dbQuery.run(
      `INSERT INTO criteria (id, tenant_id, code, name, type, default_weight, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [febCritId, tenantFebId, item.code, item.name, item.type, item.default_weight, item.description]
    );
    criteriaMapFEB[item.code] = febCritId;
  }

  // 4. Seed Lecturers for FTI
  const lecturersFTI = [
    { id: uuidv4(), name: 'Dr. Ir. Budi Santoso, M.T.', nidn: '0412037501', email: 'budi.santoso@gmail.com', department: 'Teknik Informatika', values: { C1: 12, C2: 88, C3: 95, C4: 4, C5: 4 } },
    { id: uuidv4(), name: 'Siti Rahma, S.Kom., M.T.', nidn: '0415088202', email: 'siti.rahma@gmail.com', department: 'Teknik Informatika', values: { C1: 6, C2: 95, C3: 98, C4: 5, C5: 6 } },
    { id: uuidv4(), name: 'Joko Susilo, M.Kom.', nidn: '0420117803', email: 'joko.susilo@gmail.com', department: 'Sistem Informasi', values: { C1: 18, C2: 78, C3: 85, C4: 3, C5: 3 } },
    { id: uuidv4(), name: 'Amalia Putri, S.Si., M.Cs.', nidn: '0428059004', email: 'amalia.putri@gmail.com', department: 'Sistem Informasi', values: { C1: 3, C2: 90, C3: 90, C4: 4, C5: 2 } }
  ];

  for (const lec of lecturersFTI) {
    await dbQuery.run(
      `INSERT INTO lecturers (id, tenant_id, name, nidn, email, department, avatar_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [lec.id, tenantFtiId, lec.name, lec.nidn, lec.email, lec.department, `https://api.dicebear.com/7.x/adventurer/svg?seed=${lec.name.replace(/\s+/g, '')}`]
    );

    // Seed criteria values for this lecturer
    for (const [code, val] of Object.entries(lec.values)) {
      await dbQuery.run(
        `INSERT INTO lecturer_criteria_values (id, tenant_id, lecturer_id, criteria_id, value) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), tenantFtiId, lec.id, criteriaMapFTI[code], val]
      );
    }
  }

  // 5. Seed Lecturers for FEB
  const lecturersFEB = [
    { id: uuidv4(), name: 'Prof. Dr. Hendra Wijaya, S.E., M.Si.', nidn: '0308056801', email: 'hendra.wijaya@gmail.com', department: 'Manajemen', values: { C1: 25, C2: 85, C3: 90, C4: 3, C5: 5 } },
    { id: uuidv4(), name: 'Dewi Lestari, S.E., M.Ak.', nidn: '0314098502', email: 'dewi.lestari@gmail.com', department: 'Akuntansi', values: { C1: 8, C2: 92, C3: 95, C4: 5, C5: 4 } }
  ];

  for (const lec of lecturersFEB) {
    await dbQuery.run(
      `INSERT INTO lecturers (id, tenant_id, name, nidn, email, department, avatar_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [lec.id, tenantFebId, lec.name, lec.nidn, lec.email, lec.department, `https://api.dicebear.com/7.x/adventurer/svg?seed=${lec.name.replace(/\s+/g, '')}`]
    );

    // Seed criteria values for this lecturer
    for (const [code, val] of Object.entries(lec.values)) {
      await dbQuery.run(
        `INSERT INTO lecturer_criteria_values (id, tenant_id, lecturer_id, criteria_id, value) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), tenantFebId, lec.id, criteriaMapFEB[code], val]
      );
    }
  }

  console.log('Seeding completed successfully.');
}

export default db;
