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

// Экшен креатор для вывода корневого каталога  нахрен не нужен!!!!

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
// Запрос истории заказов  OrderFind.

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

// проверка писанины

// const store = createStore(promiseReducer);

// store.subscribe(() => console.log(store.getState()));

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
