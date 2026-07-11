import { createContext, useContext, useEffect } from "react";

export const TopbarActionsContext = createContext(null);

export function useTopbarActions(actions, deps = []) {
  const setActions = useContext(TopbarActionsContext);
  useEffect(() => {
    setActions(actions ?? null);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
