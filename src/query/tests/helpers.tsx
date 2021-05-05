import {
  AnyAction,
  configureStore,
  EnhancedStore,
  Middleware,
  Store,
} from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { act } from '@testing-library/react-hooks'
import React, { Reducer, useCallback } from 'react'
import { Provider } from 'react-redux'

export const ANY = 0 as any

export const DEFAULT_DELAY_MS = 150

export const getSerializedHeaders = (headers: Headers = new Headers()) => {
  let result: Record<string, string> = {}
  headers.forEach((val, key) => {
    result[key] = val
  })
  return result
}

export async function waitMs(time = DEFAULT_DELAY_MS) {
  const now = Date.now()
  while (Date.now() < now + time) {
    await new Promise((res) => process.nextTick(res))
  }
}

export function waitForFakeTimer(time = DEFAULT_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export function withProvider(store: Store<any>) {
  return function Wrapper({ children }: any) {
    return <Provider store={store}>{children}</Provider>
  }
}

export const hookWaitFor = async (cb: () => void, time = 2000) => {
  const startedAt = Date.now()

  while (true) {
    try {
      cb()
      return true
    } catch (e) {
      if (Date.now() > startedAt + time) {
        throw e
      }
      await act(() => waitMs(2))
    }
  }
}

export const useRenderCounter = () => {
  const countRef = React.useRef(0)

  React.useEffect(() => {
    countRef.current += 1
  })

  React.useEffect(() => {
    return () => {
      countRef.current = 0
    }
  }, [])

  return useCallback(() => countRef.current, [])
}

export function matchSequence(
  _actions: AnyAction[],
  ...matchers: Array<(arg: any) => boolean>
) {
  const actions = _actions.concat()
  actions.shift() // remove INIT
  expect(matchers.length).toBe(actions.length)
  for (let i = 0; i < matchers.length; i++) {
    expect(matchers[i](actions[i])).toBe(true)
  }
}

export function notMatchSequence(
  _actions: AnyAction[],
  ...matchers: Array<Array<(arg: any) => boolean>>
) {
  const actions = _actions.concat()
  actions.shift() // remove INIT
  expect(matchers.length).toBe(actions.length)
  for (let i = 0; i < matchers.length; i++) {
    for (const matcher of matchers[i]) {
      expect(matcher(actions[i])).not.toBe(true)
    }
  }
}

export const actionsReducer = {
  actions: (state: AnyAction[] = [], action: AnyAction) => {
    return [...state, action]
  },
}

export function setupApiStore<
  A extends {
    reducerPath: any
    reducer: Reducer<any, any>
    middleware: Middleware
    util: { resetApiState(): any }
  },
  R extends Record<string, Reducer<any, any>>
>(api: A, extraReducers?: R, withoutListeners?: boolean) {
  const getStore = () =>
    configureStore({
      reducer: { [api.reducerPath]: api.reducer, ...extraReducers },
      middleware: (gdm) =>
        gdm({ serializableCheck: false, immutableCheck: false }).concat(
          api.middleware
        ),
    })

  type StoreType = ReturnType<typeof getStore> extends EnhancedStore<
    {},
    any,
    infer M
  >
    ? EnhancedStore<
        {
          [K in A['reducerPath']]: ReturnType<A['reducer']>
        } &
          {
            [K in keyof R]: ReturnType<R[K]>
          },
        AnyAction,
        M
      >
    : never

  const initialStore = getStore() as StoreType
  const refObj = {
    api,
    store: initialStore,
    wrapper: withProvider(initialStore),
  }
  let cleanupListeners: () => void

  beforeEach(() => {
    const store = getStore() as StoreType
    refObj.store = store
    refObj.wrapper = withProvider(store)
    if (!withoutListeners) {
      cleanupListeners = setupListeners(store.dispatch)
    }
  })
  afterEach(() => {
    if (!withoutListeners) {
      cleanupListeners()
    }
    refObj.store.dispatch(api.util.resetApiState())
  })

  return refObj
}

// type test helpers

export declare type IsAny<T, True, False = never> = true | false extends (
  T extends never ? true : false
)
  ? True
  : False

export declare type IsUnknown<T, True, False = never> = unknown extends T
  ? IsAny<T, False, True>
  : False

export function expectType<T>(t: T): T {
  return t
}

type Equals<T, U> = IsAny<
  T,
  never,
  IsAny<U, never, [T] extends [U] ? ([U] extends [T] ? any : never) : never>
>
export function expectExactType<T>(t: T) {
  return <U extends Equals<T, U>>(u: U) => {}
}

type EnsureUnknown<T extends any> = IsUnknown<T, any, never>
export function expectUnknown<T extends EnsureUnknown<T>>(t: T) {
  return t
}

type EnsureAny<T extends any> = IsAny<T, any, never>
export function expectExactAny<T extends EnsureAny<T>>(t: T) {
  return t
}

type IsNotAny<T> = IsAny<T, never, any>
export function expectNotAny<T extends IsNotAny<T>>(t: T): T {
  return t
}

expectType<string>('5' as string)
expectType<string>('5' as const)
expectType<string>('5' as any)
expectExactType('5' as const)('5' as const)
// @ts-expect-error
expectExactType('5' as string)('5' as const)
// @ts-expect-error
expectExactType('5' as any)('5' as const)
expectUnknown('5' as unknown)
// @ts-expect-error
expectUnknown('5' as const)
// @ts-expect-error
expectUnknown('5' as any)
expectExactAny('5' as any)
// @ts-expect-error
expectExactAny('5' as const)
// @ts-expect-error
expectExactAny('5' as unknown)
