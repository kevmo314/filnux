import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Rx';

import { Store } from './store';
import { Action } from './filnux_module';

export function Select<T, O>(
    store: Store<T>, getMapFn?: (state: T) => O, setMapFn?: (value: O) => Action<T>) {
  return (target, propertyKey: PropertyKey, descriptor: PropertyDescriptor) => {
    const destination = {
      closed: !setMapFn,
      next(value: O) {
        store.dispatch(setMapFn(value));
      },
      error(err) {
        console.error(err);
        this.closed = true;
      },
      complete() {
        destination.closed = true;
      },
    };
    const source = getMapFn ? store.select(getMapFn) : store.select<T>(x => x);
    target[propertyKey] = Subject.create(destination, source);
  };
}

export function SelectValue<T, O>(
    store: Store<T>, getMapFn: (state: T) => O, setMapFn?: (value: O) => Action<T>) {
  return (target, propertyKey: PropertyKey, descriptor: PropertyDescriptor) => {
    let currentValue: O = null;
    if (getMapFn) {
      store.select(getMapFn).subscribe(value => currentValue = value);
    } else {
      // store.select(x => x).subscribe(value => currentValue = value);
    }
    Object.assign(descriptor, {
      get() {
        return currentValue;
      },
      set(value: O) {
        store.dispatch(setMapFn(value));
      },
    });
  };
}