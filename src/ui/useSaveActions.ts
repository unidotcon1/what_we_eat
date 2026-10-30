import { useUser } from '../data/auth'
import { syncSaveForCurrentUser } from '../data/saves'
import { useSaves } from '../local/store'

/** Saves on this device and, when signed in, mirrors every change to the account. */
export function useSaveActions() {
  const { saved, toggle } = useSaves()
  const { user } = useUser()
  return {
    saved,
    toggle(id: string) {
      const nowSaved = !saved.has(id)
      toggle(id)
      if (user) syncSaveForCurrentUser(user.id, id, nowSaved).catch(() => undefined)
    },
  }
}
