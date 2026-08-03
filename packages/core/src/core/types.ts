export interface MemoryNode {
  id: string;
  userId: string;
  content: string;
  primarySector: string;
  sectors: string[];
  tags: string[];
  metadata: Record<string, any>;
  simhash?: string;
  salience: number;
  decayLambda: number;
  version: number;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
}

export interface WaypointEdge {
  srcId: string;
  dstId: string;
  userId: string;
  weight: number;
  createdAt: number;
  updatedAt: number;
}

export interface TemporalFact {
  id: string;
  userId: string;
  subject: string;
  predicate: string;
  object: string;
  validFrom: number;
  validTo: number | null;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface SectorClassification {
  primarySector: string;
  sectors: string[];
  confidence: number;
}

export interface QueryResult {
  memory: MemoryNode;
  score: number;
  matchType: "semantic" | "keyword" | "waypoint";
  path?: string[];
}

export type DecayTier = "hot" | "warm" | "cold";
