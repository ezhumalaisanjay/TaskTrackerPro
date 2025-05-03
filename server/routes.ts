import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertRawMaterialSchema, 
  insertStorageBinSchema,
  insertSlugCuttingSchema,
  insertDeburringSchema,
  insertHeatingForgingSchema,
  insertTrimmingSchema,
  insertFettlingSchema,
  insertInProcessInspectionSchema,
  insertSubcontractedProcessSchema,
  insertPostBlastInspectionSchema,
  insertMachiningSchema,
  insertFinalInspectionSchema,
  insertOilingPackingSchema,
  insertDispatchSchema
} from '@shared/schema';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '@db';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      username: string;
      name: string;
      role: string;
    };
  }
}

// Set up authentication middleware using Passport.js
function setupAuth(app: Express) {
  // Initialize PostgreSQL session store
  const PgSession = connectPgSimple(session);

  // Configure session
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'manufacturing-process-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }
        const isValid = await storage.validatePassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  return { isAuthenticated };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const { isAuthenticated } = setupAuth(app);
  const httpServer = createServer(app);
  const apiPrefix = '/api';

  // ==== AUTH ROUTES ====
  app.post(`${apiPrefix}/auth/login`, passport.authenticate('local'), (req, res) => {
    res.json({ 
      user: {
        id: req.user?.id,
        username: req.user?.username,
        name: req.user?.name,
        role: req.user?.role
      } 
    });
  });

  app.post(`${apiPrefix}/auth/logout`, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get(`${apiPrefix}/auth/me`, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json({ 
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role
      } 
    });
  });

  // ==== USER ROUTES ====
  app.post(`${apiPrefix}/users`, isAuthenticated, async (req, res) => {
    try {
      // Check if user has admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const validatedData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(validatedData);
      return res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/users`, isAuthenticated, async (req, res) => {
    try {
      // Check if user has admin or supervisor role
      if (!['admin', 'supervisor'].includes(req.user?.role)) {
        return res.status(403).json({ message: 'Forbidden: Admin or Supervisor access required' });
      }

      const users = await storage.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== RAW MATERIAL ROUTES ====
  app.post(`${apiPrefix}/raw-materials`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRawMaterialSchema.parse(req.body);
      const newRawMaterial = await storage.createRawMaterial({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newRawMaterial);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating raw material:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/raw-materials`, isAuthenticated, async (req, res) => {
    try {
      const rawMaterials = await storage.getAllRawMaterials();
      return res.json(rawMaterials);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/raw-materials/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      
      const rawMaterial = await storage.getRawMaterialById(id);
      if (!rawMaterial) {
        return res.status(404).json({ message: 'Raw material not found' });
      }
      
      return res.json(rawMaterial);
    } catch (error) {
      console.error('Error fetching raw material:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/raw-materials/batch/:batchCode`, isAuthenticated, async (req, res) => {
    try {
      const batchCode = req.params.batchCode;
      const rawMaterial = await storage.getRawMaterialByBatchCode(batchCode);
      
      if (!rawMaterial) {
        return res.status(404).json({ message: 'Raw material not found' });
      }
      
      return res.json(rawMaterial);
    } catch (error) {
      console.error('Error fetching raw material by batch code:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== STORAGE BIN ROUTES ====
  app.post(`${apiPrefix}/storage-bins`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertStorageBinSchema.parse(req.body);
      const newStorageBin = await storage.createStorageBin({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newStorageBin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating storage bin assignment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/storage-bins`, isAuthenticated, async (req, res) => {
    try {
      const storageBins = await storage.getAllStorageBins();
      return res.json(storageBins);
    } catch (error) {
      console.error('Error fetching storage bins:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/warehouses/summary`, isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getWarehouseSummary();
      return res.json(summary);
    } catch (error) {
      console.error('Error fetching warehouse summary:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== SLUG CUTTING ROUTES ====
  app.post(`${apiPrefix}/slug-cutting`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSlugCuttingSchema.parse(req.body);
      const newSlugCutting = await storage.createSlugCutting({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newSlugCutting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating slug cutting record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch(`${apiPrefix}/slug-cutting/:id/complete`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }

      const updatedSlug = await storage.completeSlugCutting(id, req.body.endTime);
      return res.json(updatedSlug);
    } catch (error) {
      console.error('Error completing slug cutting:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/slug-cutting`, isAuthenticated, async (req, res) => {
    try {
      const slugs = await storage.getAllSlugCuttings();
      return res.json(slugs);
    } catch (error) {
      console.error('Error fetching slug cuttings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/slug-cutting/:slugCode`, isAuthenticated, async (req, res) => {
    try {
      const slugCode = req.params.slugCode;
      const slug = await storage.getSlugByCode(slugCode);
      
      if (!slug) {
        return res.status(404).json({ message: 'Slug not found' });
      }
      
      return res.json(slug);
    } catch (error) {
      console.error('Error fetching slug by code:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== DEBURRING ROUTES ====
  app.post(`${apiPrefix}/deburring`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDeburringSchema.parse(req.body);
      const newDeburring = await storage.createDeburring({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newDeburring);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating deburring record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/deburring`, isAuthenticated, async (req, res) => {
    try {
      const deburring = await storage.getAllDeburring();
      return res.json(deburring);
    } catch (error) {
      console.error('Error fetching deburring records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== HEATING & FORGING ROUTES ====
  app.post(`${apiPrefix}/heating-forging`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertHeatingForgingSchema.parse(req.body);
      const newHeatingForging = await storage.createHeatingForging({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newHeatingForging);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating heating & forging record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/heating-forging`, isAuthenticated, async (req, res) => {
    try {
      const heatingForging = await storage.getAllHeatingForging();
      return res.json(heatingForging);
    } catch (error) {
      console.error('Error fetching heating & forging records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== TRIMMING ROUTES ====
  app.post(`${apiPrefix}/trimming`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTrimmingSchema.parse(req.body);
      const newTrimming = await storage.createTrimming({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newTrimming);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating trimming record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/trimming`, isAuthenticated, async (req, res) => {
    try {
      const trimming = await storage.getAllTrimming();
      return res.json(trimming);
    } catch (error) {
      console.error('Error fetching trimming records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== FETTLING ROUTES ====
  app.post(`${apiPrefix}/fettling`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertFettlingSchema.parse(req.body);
      const newFettling = await storage.createFettling({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newFettling);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating fettling record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/fettling`, isAuthenticated, async (req, res) => {
    try {
      const fettling = await storage.getAllFettling();
      return res.json(fettling);
    } catch (error) {
      console.error('Error fetching fettling records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== IN-PROCESS INSPECTION ROUTES ====
  app.post(`${apiPrefix}/in-process-inspection`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInProcessInspectionSchema.parse(req.body);
      const newInspection = await storage.createInProcessInspection({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newInspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating in-process inspection record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/in-process-inspection`, isAuthenticated, async (req, res) => {
    try {
      const inspections = await storage.getAllInProcessInspections();
      return res.json(inspections);
    } catch (error) {
      console.error('Error fetching in-process inspection records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== SUBCONTRACTED PROCESSES ROUTES ====
  app.post(`${apiPrefix}/subcontracted-processes`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSubcontractedProcessSchema.parse(req.body);
      const newProcess = await storage.createSubcontractedProcess({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newProcess);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating subcontracted process record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/subcontracted-processes`, isAuthenticated, async (req, res) => {
    try {
      const processType = req.query.type as string | undefined;
      const processes = await storage.getSubcontractedProcesses(processType);
      return res.json(processes);
    } catch (error) {
      console.error('Error fetching subcontracted processes:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch(`${apiPrefix}/subcontracted-processes/:id/status`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }

      const { status, actualReturn } = req.body;
      const updatedProcess = await storage.updateSubcontractedProcessStatus(id, status, actualReturn);
      return res.json(updatedProcess);
    } catch (error) {
      console.error('Error updating subcontracted process status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== POST-BLAST INSPECTION ROUTES ====
  app.post(`${apiPrefix}/post-blast-inspection`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPostBlastInspectionSchema.parse(req.body);
      const newInspection = await storage.createPostBlastInspection({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newInspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating post-blast inspection record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/post-blast-inspection`, isAuthenticated, async (req, res) => {
    try {
      const inspections = await storage.getAllPostBlastInspections();
      return res.json(inspections);
    } catch (error) {
      console.error('Error fetching post-blast inspection records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== MACHINING ROUTES ====
  app.post(`${apiPrefix}/machining`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMachiningSchema.parse(req.body);
      const newMachining = await storage.createMachining({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newMachining);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating machining record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/machining`, isAuthenticated, async (req, res) => {
    try {
      const stage = req.query.stage ? parseInt(req.query.stage as string) : undefined;
      const machining = await storage.getMachiningRecords(stage);
      return res.json(machining);
    } catch (error) {
      console.error('Error fetching machining records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== FINAL INSPECTION ROUTES ====
  app.post(`${apiPrefix}/final-inspection`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertFinalInspectionSchema.parse(req.body);
      const newInspection = await storage.createFinalInspection({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newInspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating final inspection record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/final-inspection`, isAuthenticated, async (req, res) => {
    try {
      const inspections = await storage.getAllFinalInspections();
      return res.json(inspections);
    } catch (error) {
      console.error('Error fetching final inspection records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== OILING & PACKING ROUTES ====
  app.post(`${apiPrefix}/oiling-packing`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertOilingPackingSchema.parse(req.body);
      const newOilingPacking = await storage.createOilingPacking({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newOilingPacking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating oiling & packing record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/oiling-packing`, isAuthenticated, async (req, res) => {
    try {
      const oilingPacking = await storage.getAllOilingPacking();
      return res.json(oilingPacking);
    } catch (error) {
      console.error('Error fetching oiling & packing records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== DISPATCH ROUTES ====
  app.post(`${apiPrefix}/dispatch`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDispatchSchema.parse(req.body);
      const newDispatch = await storage.createDispatch({
        ...validatedData,
        userId: req.user!.id
      });
      return res.status(201).json(newDispatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating dispatch record:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/dispatch`, isAuthenticated, async (req, res) => {
    try {
      const dispatch = await storage.getAllDispatch();
      return res.json(dispatch);
    } catch (error) {
      console.error('Error fetching dispatch records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==== WORKFLOW-RELATED ROUTES ====
  app.get(`${apiPrefix}/parts/ready-for-stage/:stage`, isAuthenticated, async (req, res) => {
    try {
      const stage = parseInt(req.params.stage);
      if (isNaN(stage) || stage < 1 || stage > 18) {
        return res.status(400).json({ message: 'Invalid stage number' });
      }

      const parts = await storage.getPartsReadyForStage(stage);
      return res.json(parts);
    } catch (error) {
      console.error(`Error fetching parts ready for stage ${req.params.stage}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get(`${apiPrefix}/part-history/:partId`, isAuthenticated, async (req, res) => {
    try {
      const partId = parseInt(req.params.partId);
      if (isNaN(partId)) {
        return res.status(400).json({ message: 'Invalid part ID format' });
      }

      const history = await storage.getPartHistory(partId);
      return res.json(history);
    } catch (error) {
      console.error('Error fetching part history:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return httpServer;
}
