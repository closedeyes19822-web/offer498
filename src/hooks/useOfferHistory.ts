import { useCallback, useRef, useState } from "react";
import type { Offer } from "@/types/offer";

export function useOfferHistory(initial: Offer[] = []) {
  const [offers, setOffersState] = useState<Offer[]>(initial);
  const past = useRef<Offer[][]>([]);
  const future = useRef<Offer[][]>([]);

  const commit = useCallback((next: Offer[]) => {
    past.current.push(offers);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    setOffersState(next);
  }, [offers]);

  const addOffer = useCallback((o: Offer) => commit([...offers, o]), [offers, commit]);
  const updateOffer = useCallback((id: string, patch: Partial<Offer>) =>
    commit(offers.map((o) => (o.id === id ? { ...o, ...patch } : o))), [offers, commit]);
  const removeOffer = useCallback((id: string) =>
    commit(offers.filter((o) => o.id !== id)), [offers, commit]);
  const clearAll = useCallback(() => commit([]), [commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(offers);
    setOffersState(prev);
  }, [offers]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(offers);
    setOffersState(next);
  }, [offers]);

  return {
    offers,
    addOffer,
    updateOffer,
    removeOffer,
    clearAll,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
