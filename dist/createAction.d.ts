import { Action } from 'redux';
import { IsUnknownOrNonInferrable, IfMaybeUndefined, IfVoid, IsAny } from './tsHelpers';
/**
 * An action with a string type and an associated payload. This is the
 * type of action returned by `createAction()` action creators.
 *
 * @template P The type of the action's payload.
 * @template T the type used for the action type.
 * @template M The type of the action's meta (optional)
 * @template E The type of the action's error (optional)
 *
 * @public
 */
export declare type PayloadAction<P = void, T extends string = string, M = never, E = never> = {
    payload: P;
    type: T;
} & ([M] extends [never] ? {} : {
    meta: M;
}) & ([E] extends [never] ? {} : {
    error: E;
});
/**
 * A "prepare" method to be used as the second parameter of `createAction`.
 * Takes any number of arguments and returns a Flux Standard Action without
 * type (will be added later) that *must* contain a payload (might be undefined).
 *
 * @public
 */
export declare type PrepareAction<P> = ((...args: any[]) => {
    payload: P;
}) | ((...args: any[]) => {
    payload: P;
    meta: any;
}) | ((...args: any[]) => {
    payload: P;
    error: any;
}) | ((...args: any[]) => {
    payload: P;
    meta: any;
    error: any;
});
/**
 * Internal version of `ActionCreatorWithPreparedPayload`. Not to be used externally.
 *
 * @internal
 */
export declare type _ActionCreatorWithPreparedPayload<PA extends PrepareAction<any> | void, T extends string = string> = PA extends PrepareAction<infer P> ? ActionCreatorWithPreparedPayload<Parameters<PA>, P, T, ReturnType<PA> extends {
    error: infer E;
} ? E : never, ReturnType<PA> extends {
    meta: infer M;
} ? M : never> : void;
/**
 * Basic type for all action creators.
 */
interface BaseActionCreator<P, T extends string, M = never, E = never> {
    type: T;
    match(action: Action<unknown>): action is PayloadAction<P, T, M, E>;
}
/**
 * An action creator that takes multiple arguments that are passed to a `PrepareAction` method to create the final Action.
 * @typeParam Args arguments for the action creator function
 * @typeParam P `payload` type
 * @typeParam T `type` name
 * @typeParam E optional `error` type
 * @typeParam M optional `meta` type
 *
 * @public
 */
export interface ActionCreatorWithPreparedPayload<Args extends unknown[], P, T extends string = string, E = never, M = never> extends BaseActionCreator<P, T, M, E> {
    (...args: Args): PayloadAction<P, T, M, E>;
}
/**
 * An action creator of type `T` that takes an optional payload of type `P`.
 *
 * @public
 */
export interface ActionCreatorWithOptionalPayload<P, T extends string = string> extends BaseActionCreator<P, T> {
    (payload?: undefined): PayloadAction<undefined, T>;
    <PT extends Diff<P, undefined>>(payload?: PT): PayloadAction<PT, T>;
}
/**
 * An action creator of type `T` that takes no payload.
 *
 * @public
 */
export interface ActionCreatorWithoutPayload<T extends string = string> extends BaseActionCreator<undefined, T> {
    (): PayloadAction<undefined, T>;
}
/**
 * An action creator of type `T` that requires a payload of type P.
 *
 * @public
 */
export interface ActionCreatorWithPayload<P, T extends string = string> extends BaseActionCreator<P, T> {
    <PT extends P>(payload: PT): PayloadAction<PT, T>;
    (payload: P): PayloadAction<P, T>;
}
/**
 * An action creator of type `T` whose `payload` type could not be inferred. Accepts everything as `payload`.
 *
 * @public
 */
export interface ActionCreatorWithNonInferrablePayload<T extends string = string> extends BaseActionCreator<unknown, T> {
    <PT extends unknown>(payload: PT): PayloadAction<PT, T>;
}
/**
 * An action creator that produces actions with a `payload` attribute.
 *
 * @typeParam P the `payload` type
 * @typeParam T the `type` of the resulting action
 * @typeParam PA if the resulting action is preprocessed by a `prepare` method, the signature of said method.
 *
 * @public
 */
export declare type PayloadActionCreator<P = void, T extends string = string, PA extends PrepareAction<P> | void = void> = IfPrepareActionMethodProvided<PA, _ActionCreatorWithPreparedPayload<PA, T>, IsAny<P, ActionCreatorWithPayload<any, T>, IsUnknownOrNonInferrable<P, ActionCreatorWithNonInferrablePayload<T>, IfVoid<P, ActionCreatorWithoutPayload<T>, IfMaybeUndefined<P, ActionCreatorWithOptionalPayload<P, T>, ActionCreatorWithPayload<P, T>>>>>>;
/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type The action type to use for created actions.
 * @param prepare (optional) a method that takes any number of arguments and returns { payload } or { payload, meta }.
 *                If this is given, the resulting action creator will pass it's arguments to this method to calculate payload & meta.
 */
export declare function createAction<P = void, T extends string = string>(type: T): PayloadActionCreator<P, T>;
export declare function createAction<PA extends PrepareAction<any>, T extends string = string>(type: T, prepareAction: PA): PayloadActionCreator<ReturnType<PA>['payload'], T, PA>;
/**
 * Returns the action type of the actions created by the passed
 * `createAction()`-generated action creator (arbitrary action creators
 * are not supported).
 *
 * @param action The action creator whose action type to get.
 * @returns The action type used by the action creator.
 */
export declare function getType<T extends string>(actionCreator: PayloadActionCreator<any, T>): T;
declare type Diff<T, U> = T extends U ? never : T;
declare type IfPrepareActionMethodProvided<PA extends PrepareAction<any> | void, True, False> = PA extends (...args: any[]) => any ? True : False;
export {};
