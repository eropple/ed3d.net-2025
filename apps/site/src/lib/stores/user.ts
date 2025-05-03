import { writable } from "svelte/store";

import type { UserPrivate } from "$lib/domain/users/types";

export type UserState = {
  user: UserPrivate | null;
  loading: boolean;
};

const initialState: UserState = {
  user: null,
  loading: true
};

function createUserStore() {
  const { subscribe, set, update } = writable<UserState>(initialState);

  return {
    subscribe,
    setUser: (user: UserPrivate | null) => update(state => ({ ...state, user, loading: false })),
    clearUser: () => update(state => ({ ...state, user: null, loading: false })),
    setLoading: (loading: boolean) => update(state => ({ ...state, loading }))
  };
}

export const userStore = createUserStore();
