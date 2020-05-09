import { Middleware, Dispatch, AnyAction, MiddlewareAPI, Action } from 'redux'
import { TypedActionCreator } from '../mapBuilders'
import { createAction, BaseActionCreator } from '../createAction'

type ActionListener<A extends AnyAction, S, D extends Dispatch<AnyAction>> = (
  action: A,
  api: MiddlewareAPI<D, S>
) => void
interface ActionListenerOptions<
  A extends AnyAction,
  S,
  _ extends Dispatch<AnyAction>
> {
  /**
   * Indicates that the listener should be removed after if has run once.
   */
  once?: boolean
  /**
   * If set to true, the action will not be forwarded to
   * * listeners that were registered after this listener
   * * middlewares later in the middleware chain
   * * reducers
   * If this listener is skipped due to `options.condition`, this has no effect.
   */
  preventPropagation?: boolean
  /**
   * A function that determines if the listener should run, depending on the action and probably the state.
   */
  condition?(action: A, getState: () => S): boolean
}

interface AddListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>
> {
  type: 'actionListenerMiddleware/add'
  payload: {
    type: string
  }
  meta: {
    listener: ActionListener<A, S, D>
    options?: ActionListenerOptions<A, S, D>
  }
}

export const addListenerAction = createAction(
  'actionListenerMiddleware/add',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any>,
    options?: ActionListenerOptions<AnyAction, any, any>
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type
      },
      meta: {
        listener,
        options
      }
    }
  }
) as BaseActionCreator<
  { type: string },
  'actionListenerMiddleware/add',
  {
    listener: ActionListener<any, any, any>
    options: ActionListenerOptions<any, any, any>
  }
> & {
  <C extends TypedActionCreator<any>, S, D extends Dispatch>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>,
    options?: ActionListenerOptions<ReturnType<C>, S, D>
  ): AddListenerAction<ReturnType<C>, S, D>

  <S, D extends Dispatch>(
    type: string,
    listener: ActionListener<AnyAction, S, D>,
    options?: ActionListenerOptions<AnyAction, S, D>
  ): AddListenerAction<AnyAction, S, D>
}

interface RemoveListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>
> {
  type: 'actionListenerMiddleware/remove'
  payload: {
    type: string
  }
  meta: {
    listener: ActionListener<A, S, D>
  }
}

export const removeListenerAction = createAction(
  'actionListenerMiddleware/remove',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any>
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type
      },
      meta: {
        listener
      }
    }
  }
) as BaseActionCreator<
  { type: string },
  'actionListenerMiddleware/remove',
  {
    listener: ActionListener<any, any, any>
  }
> & {
  <C extends TypedActionCreator<any>, S, D extends Dispatch>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>
  ): RemoveListenerAction<ReturnType<C>, S, D>

  <S, D extends Dispatch>(
    type: string,
    listener: ActionListener<AnyAction, S, D>
  ): RemoveListenerAction<AnyAction, S, D>
}

export function createActionListenerMiddleware<
  S,
  D extends Dispatch<AnyAction> = Dispatch
>() {
  type ListenerEntry = ActionListenerOptions<any, S, D> & {
    listener: ActionListener<any, S, D>
  }

  const listenerMap: Record<string, Set<ListenerEntry>> = {}
  const middleware: Middleware<
    {
      (action: Action<'actionListenerMiddleware/add'>): Unsubscribe
    },
    S,
    D
  > = api => next => action => {
    if (addListenerAction.match(action)) {
      const unsubscribe = addListener(
        action.payload.type,
        action.meta.listener,
        action.meta.options
      )
      delete action.meta
      next(action)
      return unsubscribe
    }
    if (removeListenerAction.match(action)) {
      removeListener(action.payload.type, action.meta.listener)
    }

    if (listenerMap[action.type]) {
      const listeners = listenerMap[action.type]
      for (const entry of listeners) {
        if (!entry.condition || entry.condition(action, api.getState)) {
          entry.listener(action, api)
          if (entry.once) {
            listeners.delete(entry)
          }
          if (entry.preventPropagation) {
            return action
          }
        }
      }
    }
    return next(action)
  }

  type Unsubscribe = () => void

  function addListener<C extends TypedActionCreator<any>>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>,
    options?: ActionListenerOptions<ReturnType<C>, S, D>
  ): Unsubscribe
  function addListener(
    type: string,
    listener: ActionListener<AnyAction, S, D>,
    options?: ActionListenerOptions<AnyAction, S, D>
  ): Unsubscribe
  function addListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D>,
    options?: ActionListenerOptions<AnyAction, S, D>
  ): Unsubscribe {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    if (!listenerMap[type]) {
      listenerMap[type] = new Set()
    }

    let entry = findListenerEntry(listenerMap[type], listener)

    if (!entry) {
      entry = {
        ...options,
        listener
      }

      listenerMap[type].add(entry)
    }

    return () => listenerMap[type].delete(entry!)
  }

  function removeListener<C extends TypedActionCreator<any>>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>
  ): boolean
  function removeListener(
    type: string,
    listener: ActionListener<AnyAction, S, D>
  ): boolean
  function removeListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D>
  ): boolean {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    let entry = findListenerEntry(listenerMap[type], listener)

    if (!entry) {
      return false
    }

    listenerMap[type].delete(entry!)
    return true
  }

  function findListenerEntry(
    entries: Set<ListenerEntry>,
    listener: Function
  ): ListenerEntry | undefined {
    for (const entry of entries) {
      if (entry.listener === listener) {
        return entry
      }
    }
  }

  return Object.assign(middleware, { addListener, removeListener })
}
