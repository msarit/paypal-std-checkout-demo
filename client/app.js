// THIS IS THE CODE THAT I WILL USE TO KEEP A HASH FOR THE CART
// BUT USE AN ARRAY FOR THE ORDERS API

// const hashTable = {
//   key1: {
//     name: "John Doe",
//     age: 30,
//   },
//   key2: {
//     name: "Jane Doe",
//     age: 25,
//   },
// };

// const objectsArray = [];

// for (const key in hashTable) {
//   objectsArray.push(hashTable[key]);
// }

const itemPrices = {
  galaxyShoes: 100,
  spaceshipEarrings: 40,
  martianTote: 75,
};
let cartItems = [];
let cartTotal = 0;

function addToCart(productName, quantityId) {
  const quantitySelect = document.getElementById(quantityId);
  const selectedQuantity = parseInt(quantitySelect.value, 10);

  if (selectedQuantity > 0) {
    const totalForProduct = itemPrices[productName] * selectedQuantity;
    cartItems.push({
      id: productName,
      quantity: selectedQuantity,
    });
    cartTotal = calculateCartTotal();
    updateCart();
  }
}

function calculateCartTotal() {
  let total = 0;
  cartItems.forEach((item) => {
    total += item.quantity * itemPrices[item.id];
  });

  return total;
}

function updateCart() {
  const cartItemsList = document.getElementById("cart-items");
  const cartTotalElement = document.getElementById("cart-total");

  cartItemsList.innerHTML = "";
  cartTotalElement.textContent = cartTotal;

  cartItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.id}: ${item.quantity}`;
    cartItemsList.appendChild(li);
  });
}

window.paypal
  .Buttons({
    async createOrder() {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // use the "body" param to optionally pass additional order information
          // like product ids and quantities
          body: JSON.stringify({
            cart: cartItems,
          }),
        });

        const orderData = await response.json();

        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },
    async onApprove(data, actions) {
      try {
        const response = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const orderData = await response.json();

        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message

        const errorDetail = orderData?.details?.[0];

        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  actions.redirect('thank_you.html');
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
          resultMessage(
            `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`
          );
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2)
          );
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`
        );
      }
    },
  })
  .render("#paypal-button-container");

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}

// Event Listeners
const productBtns = document.querySelectorAll(".product-btn");
productBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const productName = e.target.dataset.productName;
    const quantityId = e.target.dataset.quantityId;
    addToCart(productName, quantityId);
  });
});
