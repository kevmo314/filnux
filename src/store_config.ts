import {Type} from '@angular/core';

import {Action, Reducer, State} from './filnux_module';
import {ReduxDevtoolsOptions} from './redux_devtools_extension';

export interface StoreConfig {
  children?: Type<any>[];
  reducer?: Reducer<State, Action>;
  actions?: Object|Type<Action>[];
  module: Type<any>;
  devtoolsOptions?: ReduxDevtoolsOptions;
  initialState?: State;
}
