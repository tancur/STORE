
// это общая функция для всего ? 

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

function getGQL(url ="http://shop-roles.node.ed.asmer.org.ua/graphql" ) {
  return async function gql(query, variables = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: query, variables: variables }),
  });
  const data = await response.json();


  if (data.errors) {
    throw new Error ('Ошибка сервера:' + JSON.stringify(data.errors))
  }
  return  Object.values(data)[0];
}}


// Запити




// это изначально по примеру как в домашке, тут все работает

(async () => {
  
  const url = "http://shop-roles.node.ed.asmer.org.ua/graphql";
  const gql = getGQL(url);


  // / Запит на перелiк кореневих категорій
  const catQuery = `query cats($q: String){
                                        CategoryFind(query: $q){
                                            _id name goods{
                                              name
                                            }
                                        }
                                    }`;

  const cats = await gql(catQuery, { q: '[{"parent": null}]' });
  console.log(cats);

  // Запит для отримання однієї категорії з товарами та картинками

  const catsWithImgsQuery = `query oneCatWithGoodsImgs($q: String){
    CategoryFindOne(query: $q){ _id name image{url}
    goods{_id name price images{url}}
  }}`;

  const catsWithImgs = await gql(catsWithImgsQuery, {
    q: '[{"_id":"62c94b10b74e1f5f2ec1a0dd"}]',
  });

  console.log(catsWithImgs);

  // // Запит на отримання товару з описом та картинками

  const catsWithImgsDescriptionQuery = `query catsWithImgsDescription($q: String){
    GoodFindOne(query: $q){_id images{url} name  price description

  }}`;

  const catsWithImgsDescription = await gql(catsWithImgsDescriptionQuery, {
    q: '[{"_id":"62d57ab8b74e1f5f2ec1a148"}]',
  });

  console.log(catsWithImgsDescription);

  // Запит на реєстрацію

  const register = `mutation register($login:String, $password: String){
    UserUpsert(user: {login:$login, password: $password}){
         login createdAt
    }
}`;

  const registerUserUpsert = await gql(register, {
    login: "vasya328",
    password: "пороль",
  });
  console.log(registerUserUpsert);

  // Запит на логін

  const loginQuery = `query login($login:String, $password:String){
    login(login:$login, password:$password)
}`;

  const token = await gql(loginQuery, {
    login: "test457",
    password: "123123",
  });
  console.log(token);
})();



// здесь попытка сделать экшен креаторы!!!!!!!!!!!!!!!!!!!!!!
//  но для того что бы их проверить их надо запускать с диспатчами и всей требьухой со вкладки promise.js?

// Екшенкрієйтори і так і так писати, але можна прямо в них писати запити GraphQL,
//  а можна використовувати функцію на кшталт gqlRootCats:
// const actionRootCats = () =>
//      actionPromise('rootCats', gqlRootCats())


const url = "http://shop-roles.node.ed.asmer.org.ua/graphql";
  const gql = getGQL(url);

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
  
  const actionRootCats = () =>
    actionPromise('rootCats', gqlRootCats());
  