import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let addingProduct = await api.get<Product>(`/products/${productId}`)
      .then(response => response.data)

      const addingProductStock = await api.get<Stock>(`/stock/${productId}`)
      .then(response => response.data)

      if (cart.some(product => product.id === productId)) {
        const productIndex = cart.findIndex(product => product.id === productId);
        if (cart[productIndex].amount + 1 <= addingProductStock.amount) {
          return updateProductAmount({productId, amount: (cart[productIndex].amount + 1)});
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        setCart(oldState => [...oldState, {...addingProduct, amount: 1}])
        return localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.some(product => product.id === productId)) {
      const filteredCart = cart.filter(product => product.id !== productId);

      setCart(filteredCart);

      return localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } else {
      toast.error('Erro na remoção do produto');
    }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount > 0) {
        const updatingProductStock = await api.get<Stock>(`/stock/${productId}`)
        .then(response => response.data)
        if (updatingProductStock.amount >= amount) {
          const updatedProducts = cart.map(product => product.id === productId ? {
            ...product,
            amount: amount,
          } : product);
          setCart(updatedProducts);
          return localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      toast.error('Quantidade solicitada fora de estoque');
      return
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
