import {stringify} from 'jsan';

import {Action} from './filnux_module';

/**
 * Helper actions for common tasks.
 */

export class AssignAction<T> implements Action<T> {
  type = '[Filnux] Assign action';
  constructor(private assign: T) {
    this.type = '[Filnux] Assign ' + stringify(assign, null, null, true);
  }
  reduce(state: T): T {
    return Object.assign({}, state, this.assign);
  }
}