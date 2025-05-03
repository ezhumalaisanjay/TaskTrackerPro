import { db } from "@db";
import {
  users,
  rawMaterials,
  storageBins,
  slugCutting,
  deburring,
  heatingForging,
  trimming,
  fettling,
  inProcessInspection,
  subcontractedProcesses,
  postBlastInspection,
  machining,
  finalInspection,
  oilingPacking,
  dispatch,
  type InsertUser,
  type User,
  type InsertRawMaterial,
  type InsertStorageBin,
  type InsertSlugCutting,
  type InsertDeburring,
  type InsertHeatingForging,
  type InsertTrimming,
  type InsertFettling,
  type InsertInProcessInspection,
  type InsertSubcontractedProcess,
  type InsertPostBlastInspection,
  type InsertMachining,
  type InsertFinalInspection,
  type InsertOilingPacking,
  type InsertDispatch
} from "@shared/schema";
import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { hash, compare } from "bcrypt";

export const storage = {
  // ==== USER METHODS ====
  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await hash(data.password, 10);
    const [newUser] = await db.insert(users).values({
      ...data,
      password: hashedPassword
    }).returning();
    return newUser;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  },

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  },

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  },

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await compare(password, hashedPassword);
  },

  // ==== RAW MATERIAL METHODS ====
  async createRawMaterial(data: InsertRawMaterial & { userId: number }) {
    const [newRawMaterial] = await db.insert(rawMaterials).values(data).returning();
    return newRawMaterial;
  },

  async getRawMaterialById(id: number) {
    const result = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id));
    return result[0];
  },

  async getRawMaterialByBatchCode(batchCode: string) {
    const result = await db.select().from(rawMaterials).where(eq(rawMaterials.batchCode, batchCode));
    return result[0];
  },

  async getAllRawMaterials() {
    return await db.select().from(rawMaterials).orderBy(desc(rawMaterials.createdAt));
  },

  // ==== STORAGE BIN METHODS ====
  async createStorageBin(data: InsertStorageBin & { userId: number }) {
    const [newStorageBin] = await db.insert(storageBins).values(data).returning();
    return newStorageBin;
  },

  async getAllStorageBins() {
    return await db.select().from(storageBins)
      .leftJoin(rawMaterials, eq(storageBins.rawMaterialId, rawMaterials.id))
      .orderBy(desc(storageBins.createdAt));
  },

  async getWarehouseSummary() {
    // This is a simplified example - in a real implementation, you'd calculate actual metrics
    return {
      totalRawMaterial: "3,250 kg", // Mock data
      availableBins: 14, // Mock data
      warehouseCapacity: {
        "Warehouse A": "65%",
        "Warehouse B": "42%",
        "Warehouse C": "28%"
      }
    };
  },

  // ==== SLUG CUTTING METHODS ====
  async createSlugCutting(data: InsertSlugCutting & { userId: number }) {
    const [newSlugCutting] = await db.insert(slugCutting).values(data).returning();
    return newSlugCutting;
  },

  async completeSlugCutting(id: number, endTime: string) {
    const [updatedSlug] = await db.update(slugCutting)
      .set({ 
        endTime: new Date(endTime),
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(slugCutting.id, id))
      .returning();
    return updatedSlug;
  },

  async getSlugByCode(slugCode: string) {
    const result = await db.select().from(slugCutting).where(eq(slugCutting.slugCode, slugCode));
    return result[0];
  },

  async getAllSlugCuttings() {
    return await db.select().from(slugCutting)
      .leftJoin(rawMaterials, eq(slugCutting.rawMaterialId, rawMaterials.id))
      .orderBy(desc(slugCutting.createdAt));
  },

  // ==== DEBURRING METHODS ====
  async createDeburring(data: InsertDeburring & { userId: number }) {
    const [newDeburring] = await db.insert(deburring).values(data).returning();
    return newDeburring;
  },

  async getAllDeburring() {
    return await db.select().from(deburring)
      .leftJoin(slugCutting, eq(deburring.slugId, slugCutting.id))
      .orderBy(desc(deburring.createdAt));
  },

  // ==== HEATING & FORGING METHODS ====
  async createHeatingForging(data: InsertHeatingForging & { userId: number }) {
    const [newHeatingForging] = await db.insert(heatingForging).values(data).returning();
    return newHeatingForging;
  },

  async getAllHeatingForging() {
    return await db.select().from(heatingForging)
      .leftJoin(slugCutting, eq(heatingForging.slugId, slugCutting.id))
      .orderBy(desc(heatingForging.createdAt));
  },

  // ==== TRIMMING METHODS ====
  async createTrimming(data: InsertTrimming & { userId: number }) {
    const [newTrimming] = await db.insert(trimming).values(data).returning();
    return newTrimming;
  },

  async getAllTrimming() {
    return await db.select().from(trimming)
      .leftJoin(heatingForging, eq(trimming.forgedPartId, heatingForging.id))
      .orderBy(desc(trimming.createdAt));
  },

  // ==== FETTLING METHODS ====
  async createFettling(data: InsertFettling & { userId: number }) {
    const [newFettling] = await db.insert(fettling).values(data).returning();
    return newFettling;
  },

  async getAllFettling() {
    return await db.select().from(fettling)
      .leftJoin(trimming, eq(fettling.trimmedPartId, trimming.id))
      .orderBy(desc(fettling.createdAt));
  },

  // ==== IN-PROCESS INSPECTION METHODS ====
  async createInProcessInspection(data: InsertInProcessInspection & { userId: number }) {
    const [newInspection] = await db.insert(inProcessInspection).values(data).returning();
    return newInspection;
  },

  async getAllInProcessInspections() {
    return await db.select().from(inProcessInspection)
      .leftJoin(fettling, eq(inProcessInspection.fettledPartId, fettling.id))
      .orderBy(desc(inProcessInspection.createdAt));
  },

  // ==== SUBCONTRACTED PROCESSES METHODS ====
  async createSubcontractedProcess(data: InsertSubcontractedProcess & { userId: number }) {
    const [newProcess] = await db.insert(subcontractedProcesses).values(data).returning();
    return newProcess;
  },

  async getSubcontractedProcesses(processType?: string) {
    const query = processType 
      ? db.select().from(subcontractedProcesses)
          .where(eq(subcontractedProcesses.processType, processType))
          .orderBy(desc(subcontractedProcesses.createdAt))
      : db.select().from(subcontractedProcesses)
          .orderBy(desc(subcontractedProcesses.createdAt));
    
    return await query;
  },

  async updateSubcontractedProcessStatus(id: number, status: string, actualReturn?: string) {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (actualReturn) {
      updateData.actualReturn = new Date(actualReturn);
    }
    
    const [updatedProcess] = await db.update(subcontractedProcesses)
      .set(updateData)
      .where(eq(subcontractedProcesses.id, id))
      .returning();
    
    return updatedProcess;
  },

  // ==== POST-BLAST INSPECTION METHODS ====
  async createPostBlastInspection(data: InsertPostBlastInspection & { userId: number }) {
    const [newInspection] = await db.insert(postBlastInspection).values(data).returning();
    return newInspection;
  },

  async getAllPostBlastInspections() {
    return await db.select().from(postBlastInspection)
      .leftJoin(subcontractedProcesses, eq(postBlastInspection.subcontractedProcessId, subcontractedProcesses.id))
      .orderBy(desc(postBlastInspection.createdAt));
  },

  // ==== MACHINING METHODS ====
  async createMachining(data: InsertMachining & { userId: number }) {
    const [newMachining] = await db.insert(machining).values(data).returning();
    return newMachining;
  },

  async getMachiningRecords(stage?: number) {
    const query = stage
      ? db.select().from(machining)
          .where(eq(machining.stage, stage))
          .orderBy(desc(machining.createdAt))
      : db.select().from(machining)
          .orderBy(desc(machining.createdAt));
    
    return await query;
  },

  // ==== FINAL INSPECTION METHODS ====
  async createFinalInspection(data: InsertFinalInspection & { userId: number }) {
    const [newInspection] = await db.insert(finalInspection).values(data).returning();
    return newInspection;
  },

  async getAllFinalInspections() {
    return await db.select().from(finalInspection)
      .orderBy(desc(finalInspection.createdAt));
  },

  // ==== OILING & PACKING METHODS ====
  async createOilingPacking(data: InsertOilingPacking & { userId: number }) {
    const [newOilingPacking] = await db.insert(oilingPacking).values(data).returning();
    return newOilingPacking;
  },

  async getAllOilingPacking() {
    return await db.select().from(oilingPacking)
      .orderBy(desc(oilingPacking.createdAt));
  },

  // ==== DISPATCH METHODS ====
  async createDispatch(data: InsertDispatch & { userId: number }) {
    const [newDispatch] = await db.insert(dispatch).values(data).returning();
    return newDispatch;
  },

  async getAllDispatch() {
    return await db.select().from(dispatch)
      .orderBy(desc(dispatch.createdAt));
  },

  // ==== WORKFLOW METHODS ====
  async getPartsReadyForStage(stage: number) {
    // This is a simplified implementation and would need to be enhanced for a real application
    // The actual implementation would depend on the specific flow between stages
    
    switch(stage) {
      case 1: // Raw Material Receipt
        return [];
      case 2: // Storage Bin Assignment
        return await db.select()
          .from(rawMaterials)
          .leftJoin(storageBins, eq(rawMaterials.id, storageBins.rawMaterialId))
          .where(eq(rawMaterials.qcDecision, 'accept'))
          .where(sql`${storageBins.id} IS NULL`);
      case 3: // Slug Cutting
        return await db.select()
          .from(rawMaterials)
          .leftJoin(storageBins, eq(rawMaterials.id, storageBins.rawMaterialId))
          .where(eq(rawMaterials.qcDecision, 'accept'))
          .where(sql`${storageBins.id} IS NOT NULL`);
      case 4: // Deburring
        return await db.select()
          .from(slugCutting)
          .leftJoin(deburring, eq(slugCutting.id, deburring.slugId))
          .where(eq(slugCutting.status, 'completed'))
          .where(sql`${deburring.id} IS NULL`);
      // Implement other stages similarly...
      default:
        return [];
    }
  },

  async getPartHistory(partId: number) {
    // Simplified part history implementation
    // In a real app, you'd track the complete history of a part through all stages
    return {
      rawMaterial: await db.select().from(rawMaterials).where(eq(rawMaterials.id, partId)),
      slugCutting: await db.select().from(slugCutting).where(eq(slugCutting.rawMaterialId, partId)),
      // Include other stages as needed
    };
  }
};
