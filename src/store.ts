import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';

import {Action, State} from './filnux_module';
import {StateManager} from './state_manager';

/**
 * A Store observes Actions and emits States.
 *
 * Actions are sent to the StateManager, which applies the transformation for
 * each matching reducer, then emits the state on that specification node after
 * reduction back to the store.
 */
@Injectable()
export class Store implements Observer<Action> {
  constructor(private stateManager: StateManager) {}

  select<T>(module: Type<any>): Observable<Readonly<T>> {
    // TODO: Possibly cache this observable.
    return this.stateManager
        .filter(specificationNode => specificationNode.module === module)
        .map(node => Object.freeze(<T>node.state));
  }

  /**
   * Dispatch a new action to the global state.
   * @param action The action to issue
   */
  dispatch<A extends Action>(action: A) {
    this.stateManager.update(action);
  }

  next(action: Action) {
    this.stateManager.update(action);
  }

  error(err: any) {
    this.stateManager.error(err);
  }

  complete() {
    this.stateManager.complete();
  }
}