import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { seed } from './seed'
import {
  Alert,
  AppState,
  Child,
  GearItem,
  Incident,
  ParentLocation,
  Resolution,
  ZoneId,
} from './types'

const KEY = 'minorskate-state-v1'

type Action =
  | { type: 'RESET' }
  | { type: 'ADD_CHILD'; child: Child }
  | { type: 'CHECK_IN'; id: string; at: number }
  | { type: 'CHECK_OUT'; id: string }
  | { type: 'ISSUE_GEAR'; id: string; gear: GearItem[] }
  | { type: 'MARK_HELMET_DAMAGED'; id: string }
  | { type: 'SET_WEARING'; id: string; wearing: boolean }
  | { type: 'SET_PARENT_LOC'; id: string; loc: ParentLocation }
  | { type: 'SET_ZONE'; id: string; zone: ZoneId }
  | { type: 'ADD_ALERT'; alert: Alert }
  | { type: 'RESOLVE_ALERT'; id: string }
  | { type: 'CREATE_INCIDENT'; incident: Incident }
  | { type: 'UPDATE_INCIDENT'; id: string; patch: Partial<Incident> }
  | { type: 'RESOLVE_INCIDENT'; id: string; resolution: Resolution }
  | { type: 'TOGGLE_ZONE'; zone: ZoneId; open: boolean }
  | { type: 'TOGGLE_BOOST'; zone: ZoneId; boost: boolean }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'RESET':
      return seed
    case 'ADD_CHILD':
      return { ...state, children: [...state.children, action.child] }
    case 'CHECK_IN':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id
            ? { ...c, gateStatus: 'checked_in', checkedInAt: action.at }
            : c,
        ),
      }
    case 'CHECK_OUT':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id ? { ...c, gateStatus: 'checked_out' } : c,
        ),
      }
    case 'ISSUE_GEAR':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id ? { ...c, gearIssued: action.gear } : c,
        ),
      }
    case 'MARK_HELMET_DAMAGED':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id ? { ...c, helmetDamaged: true, wearing: false } : c,
        ),
      }
    case 'SET_WEARING':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id ? { ...c, wearing: action.wearing } : c,
        ),
      }
    case 'SET_PARENT_LOC':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id ? { ...c, parentLoc: action.loc } : c,
        ),
      }
    case 'SET_ZONE':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id ? { ...c, zone: action.zone } : c,
        ),
      }
    case 'ADD_ALERT':
      return { ...state, alerts: [action.alert, ...state.alerts] }
    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.id ? { ...a, resolved: true } : a,
        ),
      }
    case 'CREATE_INCIDENT':
      return { ...state, incidents: [action.incident, ...state.incidents] }
    case 'UPDATE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.map((i) =>
          i.id === action.id ? { ...i, ...action.patch } : i,
        ),
      }
    case 'RESOLVE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.map((i) =>
          i.id === action.id
            ? { ...i, stage: 'resolution', resolution: action.resolution }
            : i,
        ),
      }
    case 'TOGGLE_ZONE':
      return {
        ...state,
        policies: {
          ...state.policies,
          [action.zone]: { ...state.policies[action.zone], open: action.open },
        },
      }
    case 'TOGGLE_BOOST':
      return {
        ...state,
        policies: {
          ...state.policies,
          [action.zone]: {
            ...state.policies[action.zone],
            patrolBoost: action.boost,
          },
        },
      }
    default:
      return state
  }
}

function init(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* ignore */
  }
  return seed
}

interface StoreCtx {
  state: AppState
  dispatch: Dispatch<Action>
}
const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore quota */
    }
  }, [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

let seq = 100
export function uid(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}`
}
