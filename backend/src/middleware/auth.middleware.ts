import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lecrank_jwt_secure_secret_key_12345';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'tenant_admin' | 'student';
    tenantId: string | null;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token otentikasi tidak ditemukan. Silakan login kembali.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };

    next();
  });
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Tidak diizinkan. Silakan login.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin untuk halaman ini.' });
    }

    next();
  };
}
