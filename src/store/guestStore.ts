import { create } from 'zustand'

const ID_KEY = 'rya_guest_id'
const NAME_KEY = 'rya_guest_name'

function getOrCreateId(): string {
  const existing = localStorage.getItem(ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(ID_KEY, id)
  return id
}

interface GuestState {
  guestId: string
  guestName: string | null
  setGuestName: (name: string) => void
  clearGuest: () => void
}

export const useGuestStore = create<GuestState>((set) => ({
  guestId: getOrCreateId(),
  guestName: localStorage.getItem(NAME_KEY),

  setGuestName: (name) => {
    localStorage.setItem(NAME_KEY, name)
    set({ guestName: name })
  },

  clearGuest: () => {
    localStorage.removeItem(NAME_KEY)
    set({ guestName: null })
  },
}))
