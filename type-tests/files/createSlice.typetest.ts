import {
  AnyAction,
  createSlice,
  PayloadAction,
  Reducer,
  createAction
} from 'redux-starter-kit'

function expectType<T>(t: T) {
  return t
}

/*
 * Test: createSlice() infers the returned slice's type.
 */
{
  const firstAction = createAction<{ count: number }>('FIRST_ACTION')

  const slice = createSlice({
    slice: 'counter',
    initialState: 0,
    reducers: {
      increment: (state: number, action) => state + action.payload,
      decrement: (state: number, action) => state - action.payload
    },
    extraReducers: {
      [firstAction.type]: (state: number, action) =>
        state + action.payload.count
    }
  })

  /* Reducer */

  const reducer: Reducer<number, PayloadAction> = slice.reducer

  // typings:expect-error
  const stringReducer: Reducer<string, PayloadAction> = slice.reducer
  // typings:expect-error
  const anyActionReducer: Reducer<string, AnyAction> = slice.reducer

  /* Actions */

  slice.actions.increment(1)
  slice.actions.decrement(1)

  // typings:expect-error
  slice.actions.other(1)

  /* Selector */

  const value: number = slice.selectors.getCounter(0)

  // typings:expect-error
  const stringValue: string = slice.selectors.getCounter(0)
}

/*
 * Test: Slice action creator types are inferred.
 */
{
  const counter = createSlice({
    slice: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload
    }
  })

  counter.actions.increment()
  counter.actions.multiply(2)
  counter.actions.multiply([2, 3, 4])

  // typings:expect-error
  counter.actions.multiply()

  // typings:expect-error
  counter.actions.multiply('2')
}

/*
 * Test: Slice action creator types properties are "string"
 */
{
  const counter = createSlice({
    slice: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload
    }
  })

  const s: string = counter.actions.increment.type
  const t: string = counter.actions.decrement.type
  const u: string = counter.actions.multiply.type

  // typings:expect-error
  const x: 'counter/increment' = counter.actions.increment.type
  // typings:expect-error
  const y: 'increment' = counter.actions.increment.type
}

/*
 * Test: Slice action creator types are inferred for enhanced reducers.
 */
{
  const counter = createSlice({
    slice: 'counter',
    initialState: 0,
    reducers: {
      strLen: {
        reducer: s => s,
        prepare: (payload: string) => ({
          payload: payload.length
        })
      },
      strLenMeta: {
        reducer: s => s,
        prepare: (payload: string) => ({
          payload,
          meta: payload.length
        })
      }
    }
  })

  expectType<string>(counter.actions.strLen('test').type)
  expectType<number>(counter.actions.strLen('test').payload)
  expectType<string>(counter.actions.strLenMeta('test').payload)
  expectType<number>(counter.actions.strLenMeta('test').meta)

  // typings:expect-error
  expectType<string>(counter.actions.strLen('test').payload)

  // typings:expect-error
  expectType<string>(counter.actions.strLenMeta('test').meta)
}
