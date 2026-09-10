/**
 * Hand-written types for the subset of the tarkov.dev schema this bot queries.
 * Field names and nullability mirror `schema-static.mjs` in `the-hideout/tarkov-api`.
 * If you widen a query in `services/tarkov/queries.ts`, widen the matching type here.
 */

export interface Vendor {
  name: string;
  normalizedName: string;
}

export interface ItemPrice {
  vendor: Vendor;
  price: number | null;
  currency: string | null;
  priceRUB: number | null;
}

export interface ItemSummary {
  id: string;
  name: string | null;
  shortName: string | null;
}

export interface Item extends ItemSummary {
  normalizedName: string | null;
  updated: string | null;
  avg24hPrice: number | null;
  lastLowPrice: number | null;
  low24hPrice: number | null;
  high24hPrice: number | null;
  changeLast48hPercent: number | null;
  basePrice: number;
  wikiLink: string | null;
  link: string | null;
  iconLink: string | null;
  inspectImageLink: string | null;
  types: string[];
  sellFor: ItemPrice[] | null;
  buyFor: ItemPrice[] | null;
}

export interface Ammo {
  item: {
    id: string;
    name: string | null;
    shortName: string | null;
    iconLink: string | null;
    wikiLink: string | null;
  };
  caliber: string | null;
  ammoType: string | null;
  tracer: boolean;
  tracerColor: string | null;
  damage: number;
  armorDamage: number;
  penetrationPower: number;
  penetrationChance: number;
  fragmentationChance: number;
  ricochetChance: number;
  projectileCount: number | null;
  initialSpeed: number | null;
  weight: number;
  stackMaxSize: number;
  accuracyModifier: number | null;
  recoilModifier: number | null;
  lightBleedModifier: number;
  heavyBleedModifier: number;
}

export interface TaskSummary {
  id: string;
  name: string;
  normalizedName: string;
  trader: { name: string };
}

/**
 * Flattened view of every `TaskObjective` concrete type. The interface fields
 * (`type`, `description`, `optional`, `maps`) are always present; the rest are
 * populated only for the matching concrete type via inline fragments.
 */
export interface TaskObjective {
  type: string;
  description: string;
  optional: boolean;
  maps: Array<{ name: string }>;

  // TaskObjectiveItem
  items?: Array<{ name: string | null; shortName: string | null }>;
  count?: number;
  foundInRaid?: boolean;
  // TaskObjectiveShoot
  targetNames?: string[];
  shotType?: string;
  // TaskObjectiveExtract
  exitStatus?: string[];
  // TaskObjectiveMark
  markerItem?: { name: string | null; shortName: string | null };
  // TaskObjectiveQuestItem
  questItem?: { name: string };
  // TaskObjectiveBuildItem
  item?: { name: string | null };
  // TaskObjectivePlayerLevel
  playerLevel?: number;
  // TaskObjectiveSkill
  skillLevel?: { name: string; level: number };
  // TaskObjectiveTraderLevel / TaskObjectiveTraderStanding
  trader?: { name: string };
  level?: number;
  value?: number;
  compareMethod?: string;
}

export interface TaskRewards {
  offerUnlock: Array<{
    trader: { name: string };
    level: number;
    item: { name: string | null; shortName: string | null };
  }>;
  skillLevelReward: Array<{ name: string; level: number }>;
  traderStanding: Array<{ trader: { name: string }; standing: number }>;
  items: Array<{ item: { name: string | null; shortName: string | null }; count: number }>;
  traderUnlock: Array<{ name: string }>;
}

export interface TaskDetail {
  id: string;
  name: string;
  normalizedName: string;
  experience: number;
  minPlayerLevel: number | null;
  kappaRequired: boolean | null;
  lightkeeperRequired: boolean | null;
  factionName: string | null;
  wikiLink: string | null;
  taskImageLink: string | null;
  trader: { name: string; imageLink: string | null };
  map: { name: string } | null;
  taskRequirements: Array<{ task: { name: string }; status: string[] }>;
  objectives: TaskObjective[];
  finishRewards: TaskRewards | null;
}

// --- GraphQL response envelopes ---

export interface ItemsResponse {
  items: Item[] | null;
}
export interface ItemsAutocompleteResponse {
  items: ItemSummary[] | null;
}
export interface AmmoResponse {
  ammo: Ammo[] | null;
}
export interface TasksLightResponse {
  tasks: TaskSummary[] | null;
}
export interface TaskDetailResponse {
  task: TaskDetail | null;
}
