import { create } from 'zustand';

const useCallStore = create((set) => ({
  activeCall: null,
  incomingCall: null,
  setActiveCall: (call) => set({ activeCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  resetCall: () => set({ activeCall: null, incomingCall: null }),
}));

export default useCallStore;