// СОЗДАНИЕ СТОРА

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

// Функция delay

// const delay = ms => new Promise(ok => setTimeout(() => ok(ms), ms))

// Перевірте отриманий редьюсер:

const store = createStore(promiseReducer)

store.subscribe(() => console.log(store.getState())) //має запускатися 6 разів

// store.dispatch(actionPromise('delay', delay(1000)))
// store.dispatch(actionPromise('luke', fetch("https://swapi.dev/api/people/1").then(res => res.json())))
// store.dispatch(actionPromise('tatooine', fetch("https://swapi.dev/api/planets/1").then(res => res.json())))

//за підсумком повинен вийти якийсь такий state:
/*
{
     delay: {status: 'FULFILLED', payload: 1000, error: undefined},
     luke: {status: 'FULFILLED', payload: { ..... тралівали про люка}, error: undefined},
     tatooine: {status: 'FULFILLED', payload: { ..... тралювали про планету татуїн}, error: undefined},
}
*/





// function getGQL(url = "http://shop-roles.node.ed.asmer.org.ua/graphql") {
//     return async function gql(query, variables = {}) {
       
//       const headers = {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       };
  
//       if (localStorage.authToken) {
//         headers.Authorization = "Bearer " + localStorage.authToken;
//       };
  
//       const response = await fetch(url, {
//         method: "POST",
//         headers: headers,
//         body: JSON.stringify({ query: query, variables: variables }),
//       });
//       const data = await response.json();
  
//       if (data.errors) {
//         throw new Error("Ошибка сервера:" + JSON.stringify(data.errors));
//       }
//       return Object.values(data)[0];
//     };
//   }


// // переменная для замыкания
// const url = "http://shop-roles.node.ed.asmer.org.ua/graphql";

// // замыкаем функцию на url-е

// const gql = getGQL(url);

// // вывод корневого каталога

// const gqlRootCats = () => {
//   const catQuery = `query cats($q: String) {
//       CategoryFind(query: $q) {
//         _id
//         name
//         goods {
//           name
//         }
//       }
//     }`;

//   return gql(catQuery, { q: '[{"parent": null}]' });
// };

// // Экшен креатор для вывода корневого каталога  нахрен не нужен!!!!

// // Запит для отримання однієї категорії з товарами та картинками

// const gqlOneCatWithGoodsImgs = () => {
//   const catsWithImgsQuery = `query oneCatWithGoodsImgs($q: String){
//     CategoryFindOne(query: $q){ _id name image{url}
//     goods{_id name price images{url}}
//   }}`;

//   return gql(catsWithImgsQuery, { q: '[{"_id":"62c94b10b74e1f5f2ec1a0dd"}]' });
// };

// // Запит на отримання товару з описом та картинками

// const gqlCatsWithImgsDescription = () => {
//   const catsWithImgsDescriptionQuery = `query catsWithImgsDescription($q: String) {
//       GoodFindOne(query: $q) {
//         _id
//         images {
//           url
//         }
//         name
//         price
//         description
//       }
//     }`;

//   return gql(catsWithImgsDescriptionQuery, {
//     q: '[{"_id":"62d57ab8b74e1f5f2ec1a148"}]',
//   });
// };

// // Запит на реєстрацію

// const gqlRegister = () => {
//   const registerMutation = `mutation register($login: String, $password: String) {
//       UserUpsert(user: { login: $login, password: $password }) {
//         login
//         createdAt
//       }
//     }`;

//   return gql(registerMutation, { login: "vasya1999", password: "пороль" });
// };

// // Запит на логін

// const gqlLogin = () => {
//   const loginQuery = `query login($login: String, $password: String) {
//       login(login: $login, password: $password)
//     }`;

//   return gql(loginQuery, { login: "katya145", password: "пороль" });
// };
// // Запрос истории заказов  OrderFind.

// const gqlOrderFind = () => {
//   const OrderFind = `mutation newOrder($goods: [OrderGoodInput]) {
//           OrderUpsert(order: {orderGoods: $goods}) {
//               _id
//               createdAt
//               total
//           }
//         }`;

//   return gql(OrderFind, {
//     goods: [
//       {
//         count: 4,
//         good: { _id: "62d3099ab74e1f5f2ec1a125" },
//       },
//     ],
//   });
// };

// // проверка писанины

// const store = createStore(promiseReducer);

// store.subscribe(() => console.log(store.getState()));

// store.dispatch(actionPromise("Корневой каталог: getCategories", gqlRootCats()));

// store.dispatch(
//   actionPromise(
//     "Подкаталог с картиНками: getOneCatWithGoodsImgs",
//     gqlOneCatWithGoodsImgs()
//   )
// );

// store.dispatch(
//   actionPromise(
//     "Подкаталог с картиНками и описанием: getCatsWithImgsDescription",
//     gqlCatsWithImgsDescription()
//   )
// );

// store.dispatch(actionPromise("РеГистрация: getRegister", gqlRegister()));

// store.dispatch(actionPromise("Запит на логин: getLogin", gqlLogin()));

// store.dispatch(
//   actionPromise("Запрос истории заказов: getOrderFind", gqlOrderFind())
// );
