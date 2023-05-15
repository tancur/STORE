function cartReducer(state = {}, action) {
  const { type, _id, count, good } = action;

  if (type === 'CART_ADD') {
    return {
      ...state,
      [_id]: {
        count: state[_id] ? state[_id].count + count : count,
        good,
      },
    };
  } else if (type === 'CART_SUB') {
    if (!state[_id]) {
      return state;
    }

    const newCount = state[_id].count - count;

    if (newCount <= 0) {
      const { [_id]: deletedItem, ...newState } = state;
      return newState;
    }

    return {
      ...state,
      [_id]: {
        ...state[_id],
        count: newCount,
      },
    };
  } else if (type === 'CART_DEL') {
    if (!state[_id]) {
      return state;
    }

    const { [_id]: deletedItem, ...newState } = state;
    return newState;
  } else if (type === 'CART_SET') {
    if (count <= 0) {
      if (!state[_id]) {
        return state;
      }

      const { [_id]: deletedItem, ...newState } = state;
      return newState;
    }

    return {
      ...state,
      [_id]: {
        count,
        good,
      },
    };
  } else if (type === 'CART_CLEAR') {
    return {};
  } else {
    return state;
  }
}
