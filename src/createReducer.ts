import createNextState, { Draft, isDraft, isDraftable } from 'immer'
import { AnyAction, Action, Reducer } from 'redux'
import {
  executeReducerBuilderCallback,
  ActionReducerMapBuilder
} from './mapBuilders'
import { NoInfer } from './tsHelpers'

/**
 * Defines a mapping from action types to corresponding action object shapes.
 *
 * @deprecated This should not be used manually - it is only used for internal
 *             inference purposes and should not have any further value.
 *             It might be removed in the future.
 * @public
 */
export type Actions<T extends keyof any = string> = Record<T, Action>

export interface ActionMatcher<A extends AnyAction> {
  (action: AnyAction): action is A
}

export type ActionMatcherDescription<S, A extends AnyAction> = {
  matcher: ActionMatcher<A>
  reducer: CaseReducer<S, NoInfer<A>>
}

export type ActionMatcherDescriptionCollection<S> = Array<
  ActionMatcherDescription<S, any>
>

/**
 * An *case reducer* is a reducer function for a specific action type. Case
 * reducers can be composed to full reducers using `createReducer()`.
 *
 * Unlike a normal Redux reducer, a case reducer is never called with an
 * `undefined` state to determine the initial state. Instead, the initial
 * state is explicitly specified as an argument to `createReducer()`.
 *
 * In addition, a case reducer can choose to mutate the passed-in `state`
 * value directly instead of returning a new state. This does not actually
 * cause the store state to be mutated directly; instead, thanks to
 * [immer](https://github.com/mweststrate/immer), the mutations are
 * translated to copy operations that result in a new state.
 *
 * @public
 */
export type CaseReducer<S = any, A extends Action = AnyAction> = (
  state: Draft<S>,
  action: A
) => S | void

/**
 * A mapping from action types to case reducers for `createReducer()`.
 *
 * @deprecated This should not be used manually - it is only used
 *             for internal inference purposes and using it manually
 *             would lead to type erasure.
 *             It might be removed in the future.
 * @public
 */
export type CaseReducers<S, AS extends Actions> = {
  [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : void
}

/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 *
 * @param initialState The initial state to be returned by the reducer.
 * @param actionsMap A mapping from action types to action-type-specific
 *   case reducers.
 * @param actionMatchers TODO documentation
 *
 * @public
 */
export function createReducer<
  S,
  CR extends CaseReducers<S, any> = CaseReducers<S, any>
>(
  initialState: S,
  actionsMap: CR,
  actionMatchers?: ActionMatcherDescriptionCollection<S>
): Reducer<S>
/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 * @param initialState The initial state to be returned by the reducer.
 * @param builderCallback A callback that receives a *builder* object to define
 *   case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
 *
 * @public
 */
export function createReducer<S>(
  initialState: S,
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void
): Reducer<S>

export function createReducer<S>(
  initialState: S,
  mapOrBuilderCallback:
    | CaseReducers<S, any>
    | ((builder: ActionReducerMapBuilder<S>) => void),
  actionMatchers: ActionMatcherDescriptionCollection<S> = []
): Reducer<S> {
  let [actionsMap, builderActionMatchers = []] =
    typeof mapOrBuilderCallback === 'function'
      ? executeReducerBuilderCallback(mapOrBuilderCallback)
      : [mapOrBuilderCallback]

  const allMatchers = actionMatchers.concat(builderActionMatchers)

  return function(state = initialState, action): S {
    const caseReducer =
      actionsMap[action.type] || findActionMatcherReducer(allMatchers, action)

    if (caseReducer) {
      if (isDraft(state)) {
        // If it's already a draft, we must already be inside a `createNextState` call,
        // likely because this is being wrapped in `createReducer`, `createSlice`, or nested
        // inside an existing draft. It's safe to just pass the draft to the mutator.
        const draft = state as Draft<S> // We can assume this is already a draft
        const result = caseReducer(draft, action)

        if (typeof result === 'undefined') {
          return state
        }

        return result
      } else if (!isDraftable(state)) {
        // If state is not draftable (ex: a primitive, such as 0), we want to directly
        // return the caseReducer func and not wrap it with produce.
        const result = caseReducer(state as any, action)

        if (typeof result === 'undefined') {
          throw Error(
            'A case reducer on a non-draftable value must not return undefined'
          )
        }

        return result
      } else {
        // @ts-ignore createNextState() produces an Immutable<Draft<S>> rather
        // than an Immutable<S>, and TypeScript cannot find out how to reconcile
        // these two types.
        return createNextState(state, (draft: Draft<S>) => {
          return caseReducer(draft, action)
        })
      }
    }

    return state
  }
}

function findActionMatcherReducer<S>(
  actionMatchers: ActionMatcherDescriptionCollection<S>,
  action: AnyAction
): CaseReducer<S, any> | undefined {
  const found = actionMatchers.find(({ matcher }) => matcher(action))
  if (found) {
    return found.reducer
  }
}
