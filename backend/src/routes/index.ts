import { Router } from 'express';
import { 
  register, 
  login, 
  me, 
  getTenants as getPublicTenants 
} from '../controllers/auth.controller';
import { 
  getLecturers, 
  getLecturerById, 
  createLecturer, 
  updateLecturer, 
  deleteLecturer, 
  updateLecturerValues 
} from '../controllers/lecturer.controller';
import { 
  getCriteria, 
  updateCriteriaWeights 
} from '../controllers/criteria.controller';
import { 
  createRecommendation, 
  getRecommendationHistory, 
  getRecommendationResultById 
} from '../controllers/recommendation.controller';
import { 
  getTenants as getAdminTenants, 
  createTenant, 
  updateTenant, 
  deleteTenant, 
  getUsers, 
  createUser, 
  deleteUser, 
  getSystemStats 
} from '../controllers/tenant.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// --- PUBLIC ROUTES ---
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/tenants', getPublicTenants);

// --- AUTHENTICATED USER ROUTES ---
router.get('/auth/me', authenticateToken as any, me as any);

// --- STUDENT (AND ADMIN) SPK RECOMMENDATION ROUTES ---
router.post('/recommendations', authenticateToken as any, authorizeRoles('student', 'tenant_admin') as any, createRecommendation as any);
router.get('/recommendations', authenticateToken as any, authorizeRoles('student') as any, getRecommendationHistory as any);
router.get('/recommendations/:id', authenticateToken as any, getRecommendationResultById as any);

// --- TENANT ADMIN ROUTES (LECTURERS & CRITERIA) ---
router.get('/lecturers', authenticateToken as any, getLecturers as any);
router.post('/lecturers', authenticateToken as any, authorizeRoles('tenant_admin') as any, createLecturer as any);
router.get('/lecturers/:id', authenticateToken as any, getLecturerById as any);
router.put('/lecturers/:id', authenticateToken as any, authorizeRoles('tenant_admin') as any, updateLecturer as any);
router.delete('/lecturers/:id', authenticateToken as any, authorizeRoles('tenant_admin') as any, deleteLecturer as any);
router.put('/lecturers/:id/values', authenticateToken as any, authorizeRoles('tenant_admin') as any, updateLecturerValues as any);

router.get('/criteria', authenticateToken as any, getCriteria as any);
router.put('/criteria/weights', authenticateToken as any, authorizeRoles('tenant_admin') as any, updateCriteriaWeights as any);

// --- SUPER ADMIN ROUTES ---
router.get('/tenants', authenticateToken as any, authorizeRoles('super_admin') as any, getAdminTenants as any);
router.post('/tenants', authenticateToken as any, authorizeRoles('super_admin') as any, createTenant as any);
router.put('/tenants/:id', authenticateToken as any, authorizeRoles('super_admin') as any, updateTenant as any);
router.delete('/tenants/:id', authenticateToken as any, authorizeRoles('super_admin') as any, deleteTenant as any);

router.get('/users', authenticateToken as any, authorizeRoles('super_admin') as any, getUsers as any);
router.post('/users', authenticateToken as any, authorizeRoles('super_admin') as any, createUser as any);
router.delete('/users/:id', authenticateToken as any, authorizeRoles('super_admin') as any, deleteUser as any);

router.get('/system-stats', authenticateToken as any, authorizeRoles('super_admin') as any, getSystemStats as any);

export default router;
