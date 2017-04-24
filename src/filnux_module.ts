import {Inject, ModuleWithProviders, NgModule, Type} from '@angular/core';
import {Compiler, InjectionToken, Injector, NgModuleFactory, NgModuleFactoryLoader, NgModuleRef} from '@angular/core';

import {ReduxDevtoolsExtension, ReduxDevtoolsOptions} from './redux_devtools_extension';
import {Store} from './store';
import {REDUX_DEVTOOLS_EXTENSION} from './tokens';

// States are just objects. This is here for syntactic sugar.
export type State = Object;

export abstract class Action<S> {
  type: string;
  abstract reduce<S extends State>(state: S): S;
}

export interface Reducer<S extends State, A extends Action<S>> {
  (state: S, action: A): S;
}

/**
 * A wrapper around each module's state, stored in a tree matching the feature
 * module tree.
 */
export interface Node {
  stores?: Map<string, Store<any>>;
  children?: Map<Type<any>, Node>;
}

@NgModule({providers: [ReduxDevtoolsExtension]})
export class FilnuxModule {
  static forRoot(root: Type<any>, devtoolsOptions: ReduxDevtoolsOptions = {}):
      ModuleWithProviders {
    // StateManager.setRootContext(root);
    return {
      ngModule: FilnuxModule,
      providers: [{
        provide: REDUX_DEVTOOLS_EXTENSION,
        useValue: Object.assign({serialize: {options: true}}, devtoolsOptions)
      }]
    };
  }

  constructor(private reduxDevtoolsExtension: ReduxDevtoolsExtension) {}
}