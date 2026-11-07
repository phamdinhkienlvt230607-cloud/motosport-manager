import { useContext } from 'react';
import { StoreContext } from './storeContext';

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore phải được dùng bên trong StoreProvider.');
  return store;
}