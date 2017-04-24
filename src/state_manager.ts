import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import {BehaviorSubject, Subject} from 'rxjs/Rx';

import {Action, Node, State} from './filnux_module';
import {ROOT_STORE, Store, StoreOptions} from './store';

export class CreateStoreAction<T> implements Action<State> {
  type = '[Filnux] Create store action';
  constructor(private path: string[], public options: StoreOptions<T>) {}
  reduce(root: State): State {
    let node = root;
    for (let i = 0; i < this.path.length - 1; i++) {
      const child = this.path[i];
      if (!(child in node)) {
        node[child] = {};
      }
      node = node[child];
    }
    node[this.path[this.path.length - 1]] =
        Object.freeze(this.options.initialState);
    return root;
  }
}

export class DispatchAction<T> implements Action<State> {
  get type() {
    return this.action.type;
  }
  constructor(private path: string[], public action: Action<T>) {}
  reduce(root: State): State {
    let node = root;
    for (let i = 0; i < this.path.length - 1; i++) {
      const child = this.path[i];
      if (!(child in node)) {
        node[child] = {};
      }
      node = node[child];
    }
    node[this.path[this.path.length - 1]] = Object.freeze(
        this.action.reduce(node[this.path[this.path.length - 1]]));
    return root;
  }
}
