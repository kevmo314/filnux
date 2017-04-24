import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {BehaviorSubject, Subject} from 'rxjs/Rx';

import {Action, Node, State} from './filnux_module';
import {CreateStoreAction, DispatchAction} from './state_manager';

export interface StoreOptions<T> {
  context?: Type<any>;
  actions?: Type<Action<T>>[];
  name?: string;
  initialState?: T;
}

let count = 0;

/**
 * A Store observes Actions and emits States.
 *
 * Actions are sent to the StateManager, which applies the transformation for
 * each matching reducer, then emits the state on that specification node after
 * reduction back to the store.
 */
export class Store<T> implements Observer<Action<T>> {
  private stateObservable: BehaviorSubject<Readonly<T>>;
  public path: string[];
  constructor(private options: StoreOptions<T>) {
    this.stateObservable = new BehaviorSubject<Readonly<T>>(
        Object.freeze(options.initialState || ({} as T)));
    if (options.actions) {
      this.addActions(options.actions);
    }
    this.path = [
      ...ROOT_STORE.getContextPath(options.context),
      options.name || String(++count)
    ];
    ROOT_STORE.dispatch(new CreateStoreAction<T>(this.path, options));
  }

  addAction(actionType: Type<Action<T>>): Store<T> {
    ROOT_STORE.addAction(this.path, actionType);
    return this;
  }

  addActions(actionTypes: Type<Action<T>>[]): Store<T> {
    for (const actionType of actionTypes) {
      this.addAction(actionType);
    }
    return this;
  }

  select<O>(mapFn: (value: T, index: number) => O): Observable<O> {
    return this.stateObservable.map(mapFn);
  }

  /**
   * Dispatch a new action to the global state.
   * @param action The action to issue
   */
  dispatch(action: Action<T>) {
    ROOT_STORE.dispatch(new DispatchAction(this.path, action));
    let node = ROOT_STORE.getState();
    for (const child of this.path) {
      node = node[child];
    }
    this.stateObservable.next(Object.freeze(node as T));
  }

  next(action: Action<T>) {
    this.dispatch(action);
  }

  error(err: any) {
    this.stateObservable.error(err);
  }

  complete() {
    this.stateObservable.complete();
  }
}

class RootStore {
  private state: State = {};
  public actions = new Subject<{action: Action<any>, state: State}>();

  constructor() {}

  setState(state: State) {
    this.state = state;
  }

  getState() {
    return this.state;
  }

  getContextPath(type: Type<any>): string[] {
    return type ? [type.name] : [];
  }

  dispatch(action: DispatchAction<any>|CreateStoreAction<any>) {
    this.actions.next({action, state: this.state = action.reduce(this.state)});
  }

  addAction(path: string[], actionType: Type<Action<any>>) {
    // Adds an action as a valid type.
  }
}
export const ROOT_STORE = new RootStore();