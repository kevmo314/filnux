import {InjectionToken} from '@angular/core';

import {ReduxDevtoolsOptions} from './redux_devtools_extension';
import {Store} from './store';

export const REDUX_DEVTOOLS_EXTENSION =
    new InjectionToken<ReduxDevtoolsOptions>('Redux devtools extension');