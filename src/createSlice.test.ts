import { createSlice } from './createSlice'
import { createAction, PayloadAction } from './createAction'

describe('createSlice', () => {
  describe('when slice is undefined', () => {
    it('should throw an error', () => {
      expect(() =>
        // @ts-ignore
        createSlice({
          reducers: {
            increment: state => state + 1,
            multiply: (state, action: PayloadAction<number>) =>
              state * action.payload
          },
          initialState: 0
        })
      ).toThrowError()
    })
  })

  describe('when slice is an empty string', () => {
    it('should throw an error', () => {
      expect(() =>
        createSlice({
          name: '',
          reducers: {
            increment: state => state + 1,
            multiply: (state, action: PayloadAction<number>) =>
              state * action.payload
          },
          initialState: 0
        })
      ).toThrowError()
    })
  })

  describe('when passing slice', () => {
    const reducer = createSlice({
      reducers: {
        increment: state => state + 1
      },
      initialState: 0,
      name: 'cool'
    })
    const { actions } = reducer

    it('should have the correct name', () => {
      expect(reducer.name).toBe('cool')
    })

    it('should create increment action', () => {
      expect(actions.hasOwnProperty('increment')).toBe(true)
    })

    it('should have the correct action for increment', () => {
      expect(actions.increment()).toEqual({
        type: 'cool/increment',
        payload: undefined
      })
    })

    it('should return the correct value from reducer', () => {
      expect(reducer(undefined, actions.increment())).toEqual(1)
    })
  })

  describe('when mutating state object', () => {
    const initialState = { user: '' }

    const reducer = createSlice({
      reducers: {
        setUserName: (state, action) => {
          state.user = action.payload
        }
      },
      initialState,
      name: 'user'
    })
    const { actions } = reducer

    it('should set the username', () => {
      expect(reducer(initialState, actions.setUserName('eric'))).toEqual({
        user: 'eric'
      })
    })
  })

  describe('when passing extra reducers', () => {
    const addMore = createAction('ADD_MORE')

    const reducer = createSlice({
      name: 'test',
      reducers: {
        increment: state => state + 1,
        multiply: (state, action) => state * action.payload
      },
      extraReducers: {
        [addMore.type]: (state, action) => state + action.payload.amount
      },
      initialState: 0
    })

    it('should call extra reducers when their actions are dispatched', () => {
      const result = reducer(10, addMore({ amount: 5 }))

      expect(result).toBe(15)
    })
  })

  describe('behaviour with enhanced case reducers', () => {
    it('should pass all arguments to the prepare function', () => {
      const prepare = jest.fn((payload, somethingElse) => ({ payload }))

      const testSlice = createSlice({
        name: 'test',
        initialState: 0,
        reducers: {
          testReducer: {
            reducer: s => s,
            prepare
          }
        }
      })

      expect(testSlice.actions.testReducer('a', 1)).toEqual({
        type: 'test/testReducer',
        payload: 'a'
      })
      expect(prepare).toHaveBeenCalledWith('a', 1)
    })

    it('should call the reducer function', () => {
      const reducer = jest.fn()

      const testSlice = createSlice({
        name: 'test',
        initialState: 0,
        reducers: {
          testReducer: {
            reducer,
            prepare: payload => ({ payload })
          }
        }
      })

      testSlice(0, testSlice.actions.testReducer('testPayload'))
      expect(reducer).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ payload: 'testPayload' })
      )
    })
  })
})
