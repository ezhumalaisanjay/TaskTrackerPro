import { pgTable, text, serial, integer, timestamp, decimal, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'supervisor', 'operator', 'inspector', 'warehouse_clerk', 'quality_engineer']);
export const appearanceEnum = pgEnum('appearance', ['excellent', 'good', 'acceptable', 'poor', 'unacceptable']);
export const statusEnum = pgEnum('status', ['pending', 'in_progress', 'completed', 'rejected', 'hold']);
export const qcDecisionEnum = pgEnum('qc_decision', ['accept', 'reject']);
export const visualStatusEnum = pgEnum('visual_status', ['ok', 'defect']);
export const subcontractStatusEnum = pgEnum('subcontract_status', ['pending', 'sent', 'in_progress', 'returned', 'completed']);

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Raw Materials Table
export const rawMaterials = pgTable('raw_materials', {
  id: serial('id').primaryKey(),
  batchCode: text('batch_code').notNull().unique(),
  weight: decimal('weight', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  diameter: decimal('diameter', { precision: 10, scale: 2 }).notNull(),
  length: decimal('length', { precision: 10, scale: 2 }).notNull(),
  appearance: appearanceEnum('appearance').notNull(),
  supplierCertificate: text('supplier_certificate'),
  qcDecision: qcDecisionEnum('qc_decision').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterials, {
  batchCode: (schema) => schema.min(3, "Batch code must be at least 3 characters"),
  // Using default validations for numeric fields
});

export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;

// Storage Bins Table
export const storageBins = pgTable('storage_bins', {
  id: serial('id').primaryKey(),
  rawMaterialId: integer('raw_material_id').references(() => rawMaterials.id).notNull(),
  warehouse: text('warehouse').notNull(),
  binLocation: text('bin_location').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertStorageBinSchema = createInsertSchema(storageBins);
export type InsertStorageBin = z.infer<typeof insertStorageBinSchema>;
export type StorageBin = typeof storageBins.$inferSelect;

// Slug Cutting Table
export const slugCutting = pgTable('slug_cutting', {
  id: serial('id').primaryKey(),
  slugCode: text('slug_code').notNull().unique(),
  rawMaterialId: integer('raw_material_id').references(() => rawMaterials.id).notNull(),
  bladeThickness: decimal('blade_thickness', { precision: 10, scale: 2 }).notNull(),
  cuttingSpeed: integer('cutting_speed').notNull(),
  weight: decimal('weight', { precision: 10, scale: 2 }).notNull(),
  length: decimal('length', { precision: 10, scale: 2 }).notNull(),
  appearance: appearanceEnum('appearance').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('in_progress').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertSlugCuttingSchema = createInsertSchema(slugCutting, {
  slugCode: (schema) => schema.min(3, "Slug code must be at least 3 characters"),
  // Using default validations for numeric fields
});

export type InsertSlugCutting = z.infer<typeof insertSlugCuttingSchema>;
export type SlugCutting = typeof slugCutting.$inferSelect;

// Deburring & Cleaning Table
export const deburring = pgTable('deburring', {
  id: serial('id').primaryKey(),
  slugId: integer('slug_id').references(() => slugCutting.id).notNull(),
  visualStatus: visualStatusEnum('visual_status').notNull(),
  defectNotes: text('defect_notes'),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertDeburringSchema = createInsertSchema(deburring);
export type InsertDeburring = z.infer<typeof insertDeburringSchema>;
export type Deburring = typeof deburring.$inferSelect;

// Heating & Forging Table
export const heatingForging = pgTable('heating_forging', {
  id: serial('id').primaryKey(),
  slugId: integer('slug_id').references(() => slugCutting.id).notNull(),
  furnaceTemp: integer('furnace_temp').notNull(),
  strokeLength: decimal('stroke_length', { precision: 10, scale: 2 }).notNull(),
  offset: decimal('offset', { precision: 10, scale: 2 }).notNull(),
  measuredTemp: integer('measured_temp').notNull(),
  dimensions: json('dimensions').notNull(), // Store multiple dimension measurements as JSON
  appearance: appearanceEnum('appearance').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertHeatingForgingSchema = createInsertSchema(heatingForging, {
  // Using default validations for numeric fields
});

export type InsertHeatingForging = z.infer<typeof insertHeatingForgingSchema>;
export type HeatingForging = typeof heatingForging.$inferSelect;

// Trimming Table
export const trimming = pgTable('trimming', {
  id: serial('id').primaryKey(),
  forgedPartId: integer('forged_part_id').references(() => heatingForging.id).notNull(),
  strokeLength: decimal('stroke_length', { precision: 10, scale: 2 }).notNull(),
  offset: decimal('offset', { precision: 10, scale: 2 }).notNull(),
  appearance: appearanceEnum('appearance').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertTrimmingSchema = createInsertSchema(trimming, {
  // Using default validations for numeric fields
});

export type InsertTrimming = z.infer<typeof insertTrimmingSchema>;
export type Trimming = typeof trimming.$inferSelect;

// Fettling Table
export const fettling = pgTable('fettling', {
  id: serial('id').primaryKey(),
  trimmedPartId: integer('trimmed_part_id').references(() => trimming.id).notNull(),
  visualStatus: visualStatusEnum('visual_status').notNull(),
  notes: text('notes'),
  routeToRework: boolean('route_to_rework').default(false),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertFettlingSchema = createInsertSchema(fettling);
export type InsertFettling = z.infer<typeof insertFettlingSchema>;
export type Fettling = typeof fettling.$inferSelect;

// In-Process Forging Inspection Table
export const inProcessInspection = pgTable('in_process_inspection', {
  id: serial('id').primaryKey(),
  fettledPartId: integer('fettled_part_id').references(() => fettling.id).notNull(),
  inspectorName: text('inspector_name').notNull(),
  measurements: json('measurements').notNull(), // Store multiple measurements as JSON
  passFail: qcDecisionEnum('pass_fail').notNull(),
  comments: text('comments'),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertInProcessInspectionSchema = createInsertSchema(inProcessInspection, {
  inspectorName: (schema) => schema.min(2, "Inspector name must be at least 2 characters"),
});

export type InsertInProcessInspection = z.infer<typeof insertInProcessInspectionSchema>;
export type InProcessInspection = typeof inProcessInspection.$inferSelect;

// Subcontracted Processes Base Table
export const subcontractedProcesses = pgTable('subcontracted_processes', {
  id: serial('id').primaryKey(),
  partIds: json('part_ids').notNull(), // Store multiple part IDs as JSON array
  vendorName: text('vendor_name').notNull(),
  dateSent: timestamp('date_sent').notNull(),
  expectedReturn: timestamp('expected_return').notNull(),
  actualReturn: timestamp('actual_return'),
  status: subcontractStatusEnum('status').default('pending').notNull(),
  processType: text('process_type').notNull(), // 'heat_treat', 'shot_blast', 'nitrating'
  processDetails: json('process_details'), // Process-specific details as JSON
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertSubcontractedProcessSchema = createInsertSchema(subcontractedProcesses, {
  vendorName: (schema) => schema.min(2, "Vendor name must be at least 2 characters"),
});

export type InsertSubcontractedProcess = z.infer<typeof insertSubcontractedProcessSchema>;
export type SubcontractedProcess = typeof subcontractedProcesses.$inferSelect;

// Post-Blast Inspection Table
export const postBlastInspection = pgTable('post_blast_inspection', {
  id: serial('id').primaryKey(),
  subcontractedProcessId: integer('subcontracted_process_id').references(() => subcontractedProcesses.id).notNull(),
  measurements: json('measurements').notNull(), // Store multiple measurements as JSON
  appearance: appearanceEnum('appearance').notNull(),
  passFail: qcDecisionEnum('pass_fail').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertPostBlastInspectionSchema = createInsertSchema(postBlastInspection);
export type InsertPostBlastInspection = z.infer<typeof insertPostBlastInspectionSchema>;
export type PostBlastInspection = typeof postBlastInspection.$inferSelect;

// Machining Table (for all three machining stages)
export const machining = pgTable('machining', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').notNull(), // Reference to previous process depending on stage
  stage: integer('stage').notNull(), // 1, 2, or 3
  machineName: text('machine_name').notNull(),
  operatorName: text('operator_name').notNull(),
  speed: integer('speed').notNull(),
  feed: decimal('feed', { precision: 10, scale: 2 }).notNull(),
  scrapQuantity: integer('scrap_quantity').default(0).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertMachiningSchema = createInsertSchema(machining, {
  // Using default validations for numeric fields
});

export type InsertMachining = z.infer<typeof insertMachiningSchema>;
export type Machining = typeof machining.$inferSelect;

// Final Inspection Table
export const finalInspection = pgTable('final_inspection', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').notNull(), // Reference to the last machining or nitrating process
  dimensionChecks: json('dimension_checks').notNull(), // Store multiple dimension checks as JSON
  passFail: qcDecisionEnum('pass_fail').notNull(),
  comments: text('comments'),
  moveToWarehouse: boolean('move_to_warehouse').default(false),
  sendToRework: boolean('send_to_rework').default(false),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertFinalInspectionSchema = createInsertSchema(finalInspection);
export type InsertFinalInspection = z.infer<typeof insertFinalInspectionSchema>;
export type FinalInspection = typeof finalInspection.$inferSelect;

// Oiling & Packing Table
export const oilingPacking = pgTable('oiling_packing', {
  id: serial('id').primaryKey(),
  partIds: json('part_ids').notNull(), // Store multiple part IDs as JSON array
  oilBatch: text('oil_batch').notNull(),
  packingMaterial: text('packing_material').notNull(),
  quantityPacked: integer('quantity_packed').notNull(),
  totalWeight: decimal('total_weight', { precision: 10, scale: 2 }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertOilingPackingSchema = createInsertSchema(oilingPacking, {
  oilBatch: (schema) => schema.min(2, "Oil batch must be at least 2 characters"),
  packingMaterial: (schema) => schema.min(2, "Packing material must be at least 2 characters"),
  // Using default validations for numeric fields
});

export type InsertOilingPacking = z.infer<typeof insertOilingPackingSchema>;
export type OilingPacking = typeof oilingPacking.$inferSelect;

// Dispatch Table
export const dispatch = pgTable('dispatch', {
  id: serial('id').primaryKey(),
  partIds: json('part_ids').notNull(), // Store multiple part IDs as JSON array
  carrier: text('carrier').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  dispatchDate: timestamp('dispatch_date').notNull(),
  billOfLading: text('bill_of_lading'),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: statusEnum('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertDispatchSchema = createInsertSchema(dispatch, {
  carrier: (schema) => schema.min(2, "Carrier must be at least 2 characters"),
  trackingNumber: (schema) => schema.min(2, "Tracking number must be at least 2 characters"),
});

export type InsertDispatch = z.infer<typeof insertDispatchSchema>;
export type Dispatch = typeof dispatch.$inferSelect;

// Set up relationships
export const usersRelations = relations(users, ({ many }) => ({
  rawMaterials: many(rawMaterials),
  storageBins: many(storageBins),
  slugCutting: many(slugCutting),
  deburring: many(deburring),
  heatingForging: many(heatingForging),
  trimming: many(trimming),
  fettling: many(fettling),
  inProcessInspection: many(inProcessInspection),
  subcontractedProcesses: many(subcontractedProcesses),
  postBlastInspection: many(postBlastInspection),
  machining: many(machining),
  finalInspection: many(finalInspection),
  oilingPacking: many(oilingPacking),
  dispatch: many(dispatch),
}));

export const rawMaterialsRelations = relations(rawMaterials, ({ one, many }) => ({
  user: one(users, {
    fields: [rawMaterials.userId],
    references: [users.id],
  }),
  storageBins: many(storageBins),
  slugCutting: many(slugCutting),
}));

export const storageBinsRelations = relations(storageBins, ({ one }) => ({
  user: one(users, {
    fields: [storageBins.userId],
    references: [users.id],
  }),
  rawMaterial: one(rawMaterials, {
    fields: [storageBins.rawMaterialId],
    references: [rawMaterials.id],
  }),
}));

export const slugCuttingRelations = relations(slugCutting, ({ one, many }) => ({
  user: one(users, {
    fields: [slugCutting.userId],
    references: [users.id],
  }),
  rawMaterial: one(rawMaterials, {
    fields: [slugCutting.rawMaterialId],
    references: [rawMaterials.id],
  }),
  deburring: many(deburring),
}));

export const deburringRelations = relations(deburring, ({ one, many }) => ({
  user: one(users, {
    fields: [deburring.userId],
    references: [users.id],
  }),
  slug: one(slugCutting, {
    fields: [deburring.slugId],
    references: [slugCutting.id],
  }),
  heatingForging: many(heatingForging),
}));

export const heatingForgingRelations = relations(heatingForging, ({ one, many }) => ({
  user: one(users, {
    fields: [heatingForging.userId],
    references: [users.id],
  }),
  slug: one(slugCutting, {
    fields: [heatingForging.slugId],
    references: [slugCutting.id],
  }),
  trimming: many(trimming),
}));

export const trimmingRelations = relations(trimming, ({ one, many }) => ({
  user: one(users, {
    fields: [trimming.userId],
    references: [users.id],
  }),
  forgedPart: one(heatingForging, {
    fields: [trimming.forgedPartId],
    references: [heatingForging.id],
  }),
  fettling: many(fettling),
}));

export const fettlingRelations = relations(fettling, ({ one, many }) => ({
  user: one(users, {
    fields: [fettling.userId],
    references: [users.id],
  }),
  trimmedPart: one(trimming, {
    fields: [fettling.trimmedPartId],
    references: [trimming.id],
  }),
  inProcessInspection: many(inProcessInspection),
}));

export const inProcessInspectionRelations = relations(inProcessInspection, ({ one }) => ({
  user: one(users, {
    fields: [inProcessInspection.userId],
    references: [users.id],
  }),
  fettledPart: one(fettling, {
    fields: [inProcessInspection.fettledPartId],
    references: [fettling.id],
  }),
}));

export const subcontractedProcessesRelations = relations(subcontractedProcesses, ({ one, many }) => ({
  user: one(users, {
    fields: [subcontractedProcesses.userId],
    references: [users.id],
  }),
  postBlastInspection: many(postBlastInspection),
}));

export const postBlastInspectionRelations = relations(postBlastInspection, ({ one }) => ({
  user: one(users, {
    fields: [postBlastInspection.userId],
    references: [users.id],
  }),
  subcontractedProcess: one(subcontractedProcesses, {
    fields: [postBlastInspection.subcontractedProcessId],
    references: [subcontractedProcesses.id],
  }),
}));

export const machiningRelations = relations(machining, ({ one }) => ({
  user: one(users, {
    fields: [machining.userId],
    references: [users.id],
  }),
}));

export const finalInspectionRelations = relations(finalInspection, ({ one }) => ({
  user: one(users, {
    fields: [finalInspection.userId],
    references: [users.id],
  }),
}));

export const oilingPackingRelations = relations(oilingPacking, ({ one }) => ({
  user: one(users, {
    fields: [oilingPacking.userId],
    references: [users.id],
  }),
}));

export const dispatchRelations = relations(dispatch, ({ one }) => ({
  user: one(users, {
    fields: [dispatch.userId],
    references: [users.id],
  }),
}));
