import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export interface WithId {
  id: string;
}

/**
 * Converter for entities whose `id` field IS the Firestore document id. On
 * write the `id` is stripped from the stored data (it lives in the doc path);
 * on read it is injected from the snapshot id. This keeps our in-memory models
 * (which carry `id`) identical whether they came from a snapshot or a plan.
 */
export function idConverter<T extends WithId>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model) {
      const data = { ...(model as T) } as Partial<T>;
      delete data.id;
      return data as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      const data = snapshot.data();
      return { ...(data as Omit<T, "id">), id: snapshot.id } as T;
    },
  };
}
