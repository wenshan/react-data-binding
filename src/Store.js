import assign from 'object-assign';
import ReactDOM from 'react-dom';

export class Store {
  constructor(initialData) {
    this.state = initialData;
    this.listeners = [];
    this.fireChange = this.fireChange.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
  }

  setState(state) {
    this.state = assign({}, this.state, state);
    // TODO debounce ?
    ReactDOM.unstable_batchedUpdates(this.fireChange);
    // this.fireChange();
  }

  fireChange() {
    this.listeners.slice().forEach(listener => listener());
  }

  subscribe(listener) {
    const listeners = this.listeners;
    listeners.push(listener);
    let isSubscribed = true;

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    };
  }

  getState() {
    return this.state;
  }
}