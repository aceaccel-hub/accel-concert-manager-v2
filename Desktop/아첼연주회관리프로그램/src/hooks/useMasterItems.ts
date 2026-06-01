import { db } from '../db/database';
import type { MasterItem, MasterItemCategory } from '../types';

export async function getMasterItems(category: MasterItemCategory): Promise<MasterItem[]> {
  return db.masterItems.where('category').equals(category).toArray();
}

export async function getMasterItemValues(category: MasterItemCategory): Promise<string[]> {
  const items = await getMasterItems(category);
  return items.map((item) => item.value).sort();
}

export async function addMasterItem(category: MasterItemCategory, value: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.masterItems.add({
    id,
    category,
    value,
    createdAt: new Date().toISOString(),
  });
  return id;
}
