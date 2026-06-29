import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../contexts/CartContext';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('should start with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
  });

  it('should add an item to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const item = {
      product_id: '1',
      profile_id: 'seller1',
      name: 'Test Product',
      price: 100,
      image_url: null,
      stock: 10
    };

    act(() => {
      result.current.addItem(item);
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].product_id).toBe('1');
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalAmount).toBe(100);
  });

  it('should not allow items from different sellers', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const item1 = {
      product_id: '1',
      profile_id: 'seller1',
      name: 'Product 1',
      price: 100,
      image_url: null,
      stock: 10
    };

    const item2 = {
      product_id: '2',
      profile_id: 'seller2',
      name: 'Product 2',
      price: 200,
      image_url: null,
      stock: 10
    };

    act(() => {
      result.current.addItem(item1);
    });

    let addResult;
    act(() => {
      addResult = result.current.addItem(item2);
    });

    expect(addResult.ok).toBe(false);
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].profile_id).toBe('seller1');
  });

  it('should update quantity if item already exists', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const item = {
      product_id: '1',
      profile_id: 'seller1',
      name: 'Product 1',
      price: 100,
      image_url: null,
      stock: 10
    };

    act(() => {
      result.current.addItem(item);
      result.current.addItem(item, 2);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
  });

  it('should remove an item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const item = {
      product_id: '1',
      profile_id: 'seller1',
      name: 'Product 1',
      price: 100,
      image_url: null,
      stock: 10
    };

    act(() => {
      result.current.addItem(item);
      result.current.removeItem('1');
    });

    expect(result.current.items.length).toBe(0);
  });

  it('should clear the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addItem({
        product_id: '1',
        profile_id: 'seller1',
        name: 'Product 1',
        price: 100,
        image_url: null,
        stock: 10
      });
      result.current.clear();
    });

    expect(result.current.items.length).toBe(0);
  });
});
