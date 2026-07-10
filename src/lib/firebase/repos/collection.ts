import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  writeBatch,
  type CollectionReference,
  type Query,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb, USERS_COLLECTION } from "@/lib/firebase/client";
import { idConverter, type WithId } from "@/lib/firebase/converters";

/**
 * Generic CRUD over a users/{uid}/{name} subcollection of id-carrying docs.
 * Writes use setDoc with the entity id as the doc id (so create and update are
 * the same call, and migration/optimistic writes are idempotent). Firestore's
 * offline cache makes these writes echo locally before the server ack.
 */
export class CollectionRepo<T extends WithId> {
  constructor(private readonly name: string) {}

  ref(uid: string): CollectionReference<T> {
    return collection(getDb(), USERS_COLLECTION, uid, this.name).withConverter(idConverter<T>());
  }

  query(uid: string, ...constraints: QueryConstraint[]): Query<T> {
    return query(this.ref(uid), ...constraints);
  }

  async list(uid: string, ...constraints: QueryConstraint[]): Promise<T[]> {
    const snap = await getDocs(this.query(uid, ...constraints));
    return snap.docs.map((d) => d.data());
  }

  set(uid: string, item: T): Promise<void> {
    return setDoc(doc(this.ref(uid), item.id), item);
  }

  remove(uid: string, id: string): Promise<void> {
    return deleteDoc(doc(this.ref(uid), id));
  }

  /** Batched upsert of many docs (chunked under Firestore's 500-write limit). */
  async setMany(uid: string, items: T[], chunkSize = 450): Promise<void> {
    const ref = this.ref(uid);
    for (let i = 0; i < items.length; i += chunkSize) {
      const batch = writeBatch(getDb());
      for (const item of items.slice(i, i + chunkSize)) {
        batch.set(doc(ref, item.id), item);
      }
      await batch.commit();
    }
  }
}
