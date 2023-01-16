import { createContext } from "react";

export const CartContext = createContext({
  cartId: null,
  cart: [],
  setCartId: (id) => {},
  setCart: (data) => {},
});