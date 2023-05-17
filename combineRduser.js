// ===========================================
// СОЗДАНИЕ СТОРА
// ==============================================

function createStore(reducer) {
  let state = reducer(undefined, {}); //стартовая инициализация состояния, запуск редьюсера со state === undefined
  let cbs = []; //массив подписчиков

  const getState = () => state; //функция, возвращающая переменную из замыкания
  const subscribe = (cb) => (
    cbs.push(cb), //запоминаем подписчиков в массиве
    () => (cbs = cbs.filter((c) => c !== cb))
  ); //возвращаем функцию unsubscribe, которая удаляет подписчика из списка

  const dispatch = (action) => {
    if (typeof action === "function") {
      //если action - не объект, а функция
      return action(dispatch, getState); //запускаем эту функцию и даем ей dispatch и getState для работы
    }
    const newState = reducer(state, action); //пробуем запустить редьюсер
    if (newState !== state) {
      //проверяем, смог ли редьюсер обработать action
      state = newState; //если смог, то обновляем state
      for (let cb of cbs) cb(); //и запускаем подписчиков
    }
  };

  return {
    getState, //добавление функции getState в результирующий объект
    dispatch,
    subscribe, //добавление subscribe в объект
  };
}

// ==========================================

// КОРЗИНА И ВСЕ РЕДЮСЕРЫ И ЭКШЕНЫ ПО КОРЗИНЕ
// =============================================

// типы экшОнов

const actionCartAdd = (good, count = 1) => ({ type: "CART_ADD", count, good });

const actionCartSub = (good, count = 1) => ({ type: "CART_SUB", count, good });

const actionCartDel = (good) => ({ type: "CART_DEL", good });

const actionCartSet = (good, count = 1) => ({ type: "CART_SET", count, good });

const actionCartClear = () => ({ type: "CART_CLEAR" });

// функция редюсер

function cartReducer(state = {}, { type, count, good }) {
  if (type === "CART_ADD") {
    const { _id, price } = good;
    if (count < 0) {
      return { ...state };
    } else {
      return {
        ...state,
        [_id]: {
          good: { _id, price },
          count: state[_id] ? state[_id].count + count : count,
        },
      };
    }
  }

  if (type === "CART_SUB") {
    const { _id, price } = good;
    const newCount = state[_id].count - count;
    if (count < 0) {
      return { ...state };
    }
    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good: { _id, price },
          count: newCount,
        },
      };
    } else {
      const newState = { ...state };
      delete newState[_id];
      return newState;
    }
  }

  if (type === "CART_DEL") {
    const { _id } = good;
    const newState = { ...state };
    delete newState[_id];
    return newState;
  }

  if (type === "CART_SET") {
    const { _id, price } = good;
    const newCount = count;

    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good: { _id, price },
          count: newCount,
        },
      };
    } else {
      const newState = { ...state };
      delete newState[_id];
      return newState;
    }
  }

  if (type === "CART_CLEAR") {
    return (state = {});
  } else {
    return state;
  }
}

// localStoredReducer
//  Декоратор возвращает функцию-обертку (тоже редьюсер)

function localStoredReducer(originalReducer, localStorageKey) {
  let firstRun = true;

  return function wrapper(state, action) {
    if (firstRun) {
      firstRun = false;
      const keyData = localStorage.getItem(localStorageKey);

      if (keyData !== "{}" && keyData !== null) {
        return JSON.parse(keyData);
      }
    }

    const newState = originalReducer(state, action);
    localStorage.setItem(localStorageKey, JSON.stringify(newState));
    return newState;
  };
}

// =================================================

// ВСЕ ПРОМИСЫ И ЗАПРОСЫ НА СЕРВЕР

// ====================================================

// РЕДЮСЕР ДЛЯ ПРОМИСОВ

function promiseReducer(
  state = {},
  { type, promiseName, status, payload, error }
) {
  if (type === "PROMISE") {
    return {
      ...state,
      [promiseName]: { status, payload, error },
    };
  }
  return state;
}

const actionPending = (promiseName) => ({
  type: "PROMISE",
  promiseName,
  status: "PENDING",
});
const actionFulfilled = (promiseName, payload) => ({
  type: "PROMISE",
  promiseName,
  status: "FULFILLED",
  payload,
});
const actionRejected = (promiseName, error) => ({
  type: "PROMISE",
  promiseName,
  status: "REJECTED",
  error,
});

// THUNK для промисов

function actionPromise(promiseName, promise) {
  return async (dispatch) => {
    dispatch(actionPending(promiseName));
    try {
      const payload = await promise;
      dispatch(actionFulfilled(promiseName, payload));
      return payload;
    } catch (error) {
      dispatch(actionRejected(promiseName, error));
    }
  };
}

// функция для запросов

function getGQL(url = "http://shop-roles.node.ed.asmer.org.ua/graphql") {
  return async function gql(query, variables = {}) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (localStorage.authToken) {
      headers.Authorization = "Bearer " + localStorage.authToken;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: query, variables: variables }),
    });
    const data = await response.json();

    if (data.errors) {
      throw new Error("Ошибка сервера:" + JSON.stringify(data.errors));
    }
    return Object.values(data)[0];
  };
}

// переменная для замыкания
const url = "http://shop-roles.node.ed.asmer.org.ua/graphql";

// замыкаем функцию на url-е

const gql = getGQL(url);

// вывод корневого каталога

const gqlRootCats = () => {
  const catQuery = `query cats($q: String) {
      CategoryFind(query: $q) {
        _id
        name
        goods {
          name
        }
      }
    }`;

  return gql(catQuery, { q: '[{"parent": null}]' });
};

// Запит для отримання однієї категорії з товарами та картинками

const gqlOneCatWithGoodsImgs = (id) => {
  const catsWithImgsQuery = `query oneCatWithGoodsImgs($q: String){
    CategoryFindOne(query: $q){ _id name image{url}
    goods{_id name price images{url}}
  }}`;

  return gql(catsWithImgsQuery, {
    //  q: '[{"_id":"62c94b10b74e1f5f2ec1a0dd"}]' исходник

    q: JSON.stringify([{ _id: id }]),
  });
};

// Запит на отримання товару з описом та картинками

const gqlCatsWithImgsDescription = (id) => {
  const catsWithImgsDescriptionQuery = `query catsWithImgsDescription($q: String) {
      GoodFindOne(query: $q) {
        _id
        images {
          url
        }
        name
        price
        description
      }
    }`;

  return gql(catsWithImgsDescriptionQuery, {
    q: JSON.stringify([{ _id: id }]),

    // q: '[{"_id":${id}}]', не работает

    // q: '[{"_id":"62d57ab8b74e1f5f2ec1a148"}]', исходник
  });
};

// Запит на реєстрацію

const gqlRegister = (login, password) => {
  const registerMutation = `mutation register($login: String, $password: String) {
      UserUpsert(user: { login: $login, password: $password }) {
        login
        createdAt
      }
    }`;
  return gql(registerMutation, { login: login, password: password });
  // return gql(registerMutation, { login: "vasya1999", password: "пороль" });
};

// Запит на логін

const gqlLogin = (login, password) => {
  const loginQuery = `query login($login: String, $password: String) {
      login(login: $login, password: $password)
    }`;

  return gql(loginQuery, { login: login, password: password });
};
// Запрос истории заказов  OrderFind. сдается мне что это запрос на корзину OrderUpsert

const gqlOrderFind = (count, id) => {
  const OrderFind = `mutation newOrder($goods: [OrderGoodInput]) {
          OrderUpsert(order: {orderGoods: $goods}) {
              _id
              createdAt
              total
          }
        }`;

  return gql(OrderFind, {
    goods: [
      {
        count: count,
        good: { _id: id },
        // good: { _id: "62d3099ab74e1f5f2ec1a125" },
      },
    ],
  });
};

// ======================================================

// РЕДЮСЕР ДЛЯ АВТОРИЗАЦИИ

// =========================================================

function jwtDecode(token) {
  const [, payload] = token.split(".");

  const secretPart = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(secretPart);
}
// экшены для авторизации

const actionAuthLogin = (token) => ({ type: "AUTH_LOGIN", token });
const actionAuthLogout = () => ({ type: "AUTH_LOGOUT" });

// редюсер для токена

function authReducer(state = {}, { type, token }) {
  if (type === "AUTH_LOGIN") {
    const payload = jwtDecode(token);

    localStorage.authToken = token;

    return { token, payload };
  } else if (type === "AUTH_LOGOUT") {
    return {};
  } else {
    return state;
  }
}

// ===============================================================

// Комбайн редюсеров
// ==================================================================

// Определние обьекта с Редьюсерами

const reducers = {
  basket: localStoredReducer,
  query: promiseReducer,
  auth: authReducer,
};

// Комбайн редюсеров

function combineReducers(reducers) {
  function totalReducer(totalState = {}, action) {
    const newTotalState = {}; //об'єкт, який зберігатиме лише нові стани дочірніх редьюсерів

    //цикл + квадратні дужки дозволяють написати код, який працюватиме з будь-якою кількістю дочірніх ред'юсерів
    for (const [reducerName, childReducer] of Object.entries(reducers)) {
      const newState = childReducer(totalState[reducerName], action); //запуск дочірнього ред'юсера
      if (newState !== totalState[reducerName]) {
        //якщо він відреагував на action
        newTotalState[reducerName] = newState; //додаємо його в NewTotalState
      }
    }

    //Універсальна перевірка на те, що хоча б один дочірній редьюсер створив новий стейт:
    if (Object.values(newTotalState).length) {
      return { ...totalState, ...newTotalState }; //створюємо новий загальний стейт, накладаючи новий стейти дочірніх редьюсерів на старі
    }

    return totalState; //якщо екшен був зрозумілий жодним із дочірніх редьюсерів, повертаємо загальний стейт як був.
  }

  return totalReducer;
}



// =========================================================

// ТЕСТИРОВАНИЕ НЭ ПРАЦЮЭ

// ===========================================================


const store = createStore(combineReducers(reducers))

store.subscribe(() => console.log(store.getState()))

// ==============================================================

store.dispatch(actionCartAdd({ _id: "пиво", price: 50 }));   

// const store = createStore(localStoredReducer(cartReducer, "cart"));

// store.subscribe(() => console.log(store.getState())); //

// store.dispatch(actionCartAdd({ _id: "пиво", price: 50 }));
// store.dispatch(actionCartAdd({ _id: "чипсы", price: 75 }));


// то что ниже работает 



store.dispatch(actionPromise("Корневой каталог: getCategories", gqlRootCats()));

store.dispatch(
  actionPromise(
    "Подкаталог с картиНками: getOneCatWithGoodsImgs",
    gqlOneCatWithGoodsImgs("62c94b10b74e1f5f2ec1a0dd")
  )
);

store.dispatch(
  actionPromise(
    "Подкаталог с картиНками и описанием: getCatsWithImgsDescription",
    gqlCatsWithImgsDescription("62d57ab8b74e1f5f2ec1a148")
  )
);

store.dispatch(
  actionPromise("РеГистрация: getRegister", gqlRegister("vasya1999", "пороль"))
);

store.dispatch(
  actionPromise("Запит на логин: getLogin", gqlLogin("katya145", "пороль"))
);

store.dispatch(
  actionPromise(
    "Запрос истории заказов: getOrderFind",
    gqlOrderFind(3, "62d3099ab74e1f5f2ec1a125")
  )
);




// токен отобразился

// / сам токен для проверки
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOnsiaWQiOiI2Mzc3ZTEzM2I3NGUxZjVmMmVjMWMxMjUiLCJsb2dpbiI6InRlc3Q1IiwiYWNsIjpbIjYzNzdlMTMzYjc0ZTFmNWYyZWMxYzEyNSIsInVzZXIiXX0sImlhdCI6MTY2ODgxMjQ1OH0.t1eQlRwkcP7v9JxUPMo3dcGKprH-uy8ujukNI7xE3A0";


store.dispatch(actionAuthLogin(token))


// store.dispatch(actionAuthLogout()) // {}