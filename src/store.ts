import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Subject} from 'rxjs/Rx';

import {Action, Node, State} from './filnux_module';
import {DispatchAction} from './state_manager';

export interface StoreOptions<T> {
  context?: Type<any>;
  actions?: Type<Action<T>>[];
  name?: string;
  initialState?: T;
}

let count = 0;

class InitializationAction<T> extends Action<T> {
  constructor(private initialState: T) {
    super();
  }
  reduce(state: T): T {
    return this.initialState;
  }
}

/**
 * A Store observes Actions and emits States.
 *
 * Actions are sent to the StateManager, which applies the transformation for
 * each matching reducer, then emits the state on that specification node after
 * reduction back to the store.
 */
export class Store<T> implements Observer<Action<T>> {
  private stateObservable: Subject<Readonly<T>>;
  public path: string[];
  constructor(private options: StoreOptions<T>) {
    this.stateObservable = new Subject<Readonly<T>>();
    if (options.actions) {
      this.addActions(options.actions);
    }
    this.path = [
      ...ROOT_STORE.getContextPath(options.context),
      options.name || String(++count)
    ];
    if (options.initialState) {
      this.next(new InitializationAction<T>(options.initialState));
    }
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
    this.next(action);
  }

  next(action: Action<T>) {
    ROOT_STORE.dispatch(new DispatchAction(this.path, action));
    this.stateObservable.next(
        Object.freeze(ROOT_STORE.getChild(this.path) as T));
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

  getChild(path: string[]) {
    let node = this.state;
    for (const child of path) {
      node = node[child];
    }
    return node;
  }

  dispatch(action: DispatchAction<any>) {
    this.actions.next(
        {action, state: this.state = Object.freeze(action.reduce(this.state))});
  }

  addAction(path: string[], actionType: Type<Action<any>>) {
    // Adds an action as a valid type.
  }
}
export const ROOT_STORE = new RootStore();