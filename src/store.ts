import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {BehaviorSubject} from 'rxjs/Rx';

import { Action, State, Node } from './filnux_module';
import {StateManager, DispatchAction, CreateStoreAction} from './state_manager';

export interface StoreOptions<T> {
  context?: Type<any>;
  actions?: Type<Action<T>>[];
  name?: string;
}

let count = 0;

let root: Store<Node> = new Store<Node>({}, {actions: [DispatchAction, CreateStoreAction]});

/**
 * A Store observes Actions and emits States.
 *
 * Actions are sent to the StateManager, which applies the transformation for
 * each matching reducer, then emits the state on that specification node after
 * reduction back to the store.
 */
export class Store<T> implements Observer<Action<T>> {
  private actionTypes: Type<Action<T>>[] = [];
  public state: T;
  private stateObservable: BehaviorSubject<Readonly<T>>;
  public key: string;
  public context: Type<any>;
  constructor(private initialState: T, private options: StoreOptions<T>) {
    this.state = Object.freeze(initialState);
    this.stateObservable = new BehaviorSubject(this.state);
    if (options.actions) {
      this.addActions(options.actions);
    }
    this.key = options.name || String(++count);
    this.context = options.context;
    // Attach this state to the root node.
    root.next(new CreateStoreAction(this));
  }

  addAction(actionType: Type<Action<T>>): Store<T> {
    if (this.actionTypes.indexOf(actionType) == -1) {
      this.actionTypes.push(actionType);
    }
    return this;
  }

  addActions(actionTypes: Type<Action<T>>[]): Store<T> {
    for (const actionType of actionTypes) {
      this.addAction(actionType);
    }
    return this;
  }

  select(mapFn: (value: T, index: number) => any): Observable<Readonly<T>> {
    return mapFn ? this.stateObservable.map(mapFn) : this.stateObservable;
  }

  reset(state: T) {
    this.stateObservable.next(this.state = (state || this.initialState));
  }

  /**
   * Dispatch a new action to the global state.
   * @param action The action to issue
   */
  dispatch(action: Action<T>) {
    this.next(action);
  }

  next(action: Action<T>) {
    if (!this.actionTypes.find(actionType => action instanceof actionType)) {
      throw new Error(
          'Store "' + this.options.name +
          '" is not registered to handle action "' + action.type + '".');
    }
    if (root == this) {
      // This is the root store, so execute the state directly. 
      this.state = Object.freeze(action.reduce(this.state));
    } else {
      // Propagate the update to the root via a DispatchAction.
      root.next(new DispatchAction(this.context, this.key, action));
    }
    this.stateObservable.next(this.state);
  }

  error(err: any) {
    this.stateObservable.error(err);
    StateManager.error(err);
  }

  complete() {
    this.stateObservable.complete();
  }
}