import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'lecrank_jwt_secure_secret_key_12345';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, tenantId, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
    }

    // Check if user already exists
    const existingUser = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar. Silakan gunakan email lain.' });
    }

    const assignedRole = role === 'tenant_admin' ? 'tenant_admin' : 'student';
    
    // Check if tenant exists
    if (!tenantId) {
      return res.status(400).json({ message: 'Jurusan/Fakultas wajib dipilih.' });
    }

    if (tenantId) {
      const tenant = await dbQuery.get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
      if (!tenant) {
        return res.status(400).json({ message: 'Jurusan/Fakultas tidak ditemukan.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await dbQuery.run(
      `INSERT INTO users (id, tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, tenantId || null, name, email, hashedPassword, assignedRole]
    );

    res.status(201).json({ message: 'Registrasi berhasil. Silakan login.' });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat registrasi.', error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ message: 'Email atau password salah.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email atau password salah.' });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.', error: error.message });
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Tidak diizinkan.' });
    }

    const user = await dbQuery.get(
      `SELECT u.id, u.name, u.email, u.role, u.tenant_id, t.name as tenant_name 
       FROM users u 
       LEFT JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        tenantName: user.tenant_name
      }
    });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
  }
}

export async function getTenants(req: Request, res: Response) {
  try {
    const tenants = await dbQuery.all('SELECT id, name, slug FROM tenants ORDER BY name ASC');
    res.json(tenants);
  } catch (error: any) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
  }
}
