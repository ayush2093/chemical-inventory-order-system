'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Search, ShoppingBag, Plus, Trash2, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { UNIT_LOOKUP, DIMENSIONS } from '@/lib/units';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  dimension: 'WEIGHT' | 'VOLUME' | 'COUNT';
  baseUnit: string;
  inventoryBalance: string;
  basePrice: string;
}

interface CartItem {
  product: Product;
  quantity: string;
  unit: string;
}

export default function SellerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dimension, setDimension] = useState('');

  // Cart / Quotation
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState('');
  const [cartSuccess, setCartSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category) queryParams.append('category', category);
      if (dimension) queryParams.append('dimension', dimension);

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      const data = await res.json();
      setProducts(data.products);
    } catch (err: any) {
      setError(err.message || 'Error loading catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category, dimension]);

  const handleAddToCart = (product: Product) => {
    setCartSuccess('');
    setCartError('');
    // Check if product already in cart
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) return;

    // Set default unit based on dimension
    let defaultUnit = 'kg';
    if (product.dimension === 'VOLUME') defaultUnit = 'L';
    if (product.dimension === 'COUNT') defaultUnit = 'items';

    setCart([...cart, { product, quantity: '1', unit: defaultUnit }]);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleCartItemQtyChange = (productId: string, qty: string) => {
    setCart(
      cart.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleCartItemUnitChange = (productId: string, unit: string) => {
    setCart(
      cart.map((item) => (item.product.id === productId ? { ...item, unit } : item))
    );
  };

  // Live conversion rates and total math
  const getConvertedMath = (item: CartItem) => {
    const qty = parseFloat(item.quantity) || 0;
    const basePrice = parseFloat(item.product.basePrice);
    
    const lookup = UNIT_LOOKUP[item.unit];
    if (!lookup) return { rate: 0, total: 0, quantityInBase: 0 };

    const factor = parseFloat(lookup.info.factor.toString());
    
    // Converted price per selected unit
    const ratePerSelectedUnit = basePrice * factor;
    // Item subtotal
    const totalItemPrice = qty * ratePerSelectedUnit;
    // Quantity in base unit
    const quantityInBase = qty * factor;

    return {
      rate: ratePerSelectedUnit,
      total: totalItemPrice,
      quantityInBase,
    };
  };

  // Grand Total calculation
  const grandTotal = cart.reduce((sum, item) => {
    const { total } = getConvertedMath(item);
    return sum + total;
  }, 0);

  const handleSubmitQuotation = async () => {
    setCartError('');
    setCartSuccess('');
    setSubmitting(true);

    if (cart.length === 0) {
      setCartError('Quotation is empty');
      setSubmitting(false);
      return;
    }

    // Verify quantities are valid and check stock
    const payloadItems = [];
    for (const item of cart) {
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        setCartError(`Please enter a valid positive quantity for ${item.product.name}`);
        setSubmitting(false);
        return;
      }

      const { quantityInBase } = getConvertedMath(item);
      const stock = parseFloat(item.product.inventoryBalance);

      if (quantityInBase > stock) {
        // Show how much is available in their selected unit
        const lookup = UNIT_LOOKUP[item.unit];
        const factor = parseFloat(lookup.info.factor.toString());
        const availableInSelectedUnit = stock / factor;

        setCartError(
          `Insufficient stock for '${item.product.name}'. Max available: ${availableInSelectedUnit.toFixed(4)} ${item.unit} (requested: ${qty.toFixed(4)} ${item.unit})`
        );
        setSubmitting(false);
        return;
      }

      payloadItems.push({
        productId: item.product.id,
        orderedQuantity: qty,
        orderedUnit: item.unit,
      });
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadItems }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setCartSuccess('Quotation submitted successfully! Redirection to invoice...');
      setCart([]);
      fetchProducts(); // Refresh products inventory
    } catch (err: any) {
      setCartError(err.message || 'Error occurred during checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <>
      <Navbar />
      <main className="container animate-fade-in" style={{ paddingBottom: '80px', marginTop: '30px' }}>
        
        <div style={styles.gridContainer}>
          
          {/* Left: Product Search and Browsing */}
          <div style={styles.leftColumn}>
            <div style={styles.header}>
              <h1 style={styles.pageTitle}>Product Catalog</h1>
              <p style={styles.pageSubtitle}>Browse catalog compounds, verify rates in multiple dimensions, and create quotations</p>
            </div>

            {/* Filter controls */}
            <div className="glass-panel" style={styles.filterBar}>
              <div style={styles.searchContainer}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.selectsContainer}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat!}>{cat}</option>
                  ))}
                </select>

                <select
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">All Dimensions</option>
                  <option value="WEIGHT">Weight</option>
                  <option value="VOLUME">Volume</option>
                  <option value="COUNT">Count</option>
                </select>
              </div>
            </div>

            {error && <div style={styles.errorBanner}>{error}</div>}

            {loading ? (
              <div style={styles.loadingContainer}>
                <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="glass-panel" style={styles.emptyContainer}>
                <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h3>No chemicals or equipment matches</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Please refine search text or filter options.
                </p>
              </div>
            ) : (
              <div style={styles.productsGrid}>
                {products.map((product) => {
                  const stock = parseFloat(product.inventoryBalance);
                  const baseP = parseFloat(product.basePrice);
                  
                  // Display standard convenient view
                  let displayStock = '';
                  let displayPrice = '';
                  
                  if (product.dimension === 'WEIGHT') {
                    displayStock = `${(stock / 1000).toFixed(4)} kg`;
                    displayPrice = `₹${(baseP * 1000).toFixed(2)} / kg`;
                  } else if (product.dimension === 'VOLUME') {
                    displayStock = `${(stock / 1000).toFixed(4)} L`;
                    displayPrice = `₹${(baseP * 1000).toFixed(2)} / L`;
                  } else {
                    displayStock = `${stock.toFixed(0)} items`;
                    displayPrice = `₹${baseP.toFixed(2)} / item`;
                  }

                  const isInCart = cart.some((item) => item.product.id === product.id);

                  return (
                    <div key={product.id} className="glass-panel" style={styles.productCard}>
                      <div style={styles.cardHeader}>
                        <span className="num-cell" style={styles.skuTag}>{product.sku}</span>
                        <span style={styles.categoryTag}>{product.category || 'Compound'}</span>
                      </div>
                      
                      <h3 style={styles.productName}>{product.name}</h3>
                      <p style={styles.productDesc}>{product.description || 'No detailed description available.'}</p>
                      
                      <div style={styles.productMeta}>
                        <div style={styles.metaRow}>
                          <span style={styles.metaLabel}>Availability:</span>
                          <span className="num-cell" style={{ fontWeight: 'bold', color: stock > 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                            {stock > 0 ? displayStock : 'Out of Stock'}
                          </span>
                        </div>
                        <div style={styles.metaRow}>
                          <span style={styles.metaLabel}>Unit Rate:</span>
                          <span className="num-cell" style={{ fontWeight: 'bold', color: '#fff' }}>
                            {displayPrice}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="btn btn-primary"
                        style={styles.cardBtn}
                        disabled={stock <= 0 || isInCart}
                      >
                        <Plus size={16} />
                        {isInCart ? 'Added to Quotation' : 'Add to Quotation'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Quotation & Ordering Sidebar */}
          <div style={styles.rightColumn}>
            <div className="glass-panel" style={styles.cartCard}>
              <div style={styles.cartHeader}>
                <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Quotation Draft</h2>
                <span className="badge badge-pending" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                  {cart.length} items
                </span>
              </div>

              {cartError && (
                <div style={styles.cartErrorBanner}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{cartError}</span>
                </div>
              )}

              {cartSuccess && (
                <div style={styles.cartSuccessBanner}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{cartSuccess}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div style={styles.emptyCart}>
                  <ShoppingBag size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Select chemical compounds from the list to build a quotation.
                  </p>
                </div>
              ) : (
                <div style={styles.cartContent}>
                  
                  {/* Cart Items list */}
                  <div style={styles.cartItemsList}>
                    {cart.map((item) => {
                      const { rate, total, quantityInBase } = getConvertedMath(item);
                      const displayBaseQty = `${quantityInBase.toFixed(4)} ${item.product.baseUnit}`;
                      
                      return (
                        <div key={item.product.id} style={styles.cartItemRow}>
                          <div style={styles.cartItemHeader}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                              {item.product.name}
                            </span>
                            <button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              style={styles.removeBtn}
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div style={styles.cartItemInputs}>
                            <div style={{ flex: 1 }}>
                              <label style={styles.miniLabel} htmlFor={`qty-${item.product.id}`}>Qty</label>
                              <input
                                id={`qty-${item.product.id}`}
                                type="number"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleCartItemQtyChange(item.product.id, e.target.value)}
                                style={styles.miniInput}
                                min="0"
                              />
                            </div>
                            
                            <div style={{ width: '90px' }}>
                              <label style={styles.miniLabel} htmlFor={`unit-${item.product.id}`}>Unit</label>
                              <select
                                id={`unit-${item.product.id}`}
                                value={item.unit}
                                onChange={(e) => handleCartItemUnitChange(item.product.id, e.target.value)}
                                style={styles.miniSelect}
                              >
                                {item.product.dimension === 'WEIGHT' && (
                                  <>
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                  </>
                                )}
                                {item.product.dimension === 'VOLUME' && (
                                  <>
                                    <option value="L">L</option>
                                    <option value="mL">mL</option>
                                  </>
                                )}
                                {item.product.dimension === 'COUNT' && <option value="items">items</option>}
                              </select>
                            </div>
                          </div>

                          {/* Conversion feedback audit breakdown */}
                          <div style={styles.auditBlock}>
                            <div style={styles.auditLine}>
                              <span>Unit Rate:</span>
                              <span className="num-cell" style={styles.whiteText}>
                                ₹{rate.toFixed(4)} / {item.unit}
                              </span>
                            </div>
                            <div style={styles.auditLine}>
                              <span>Converted Storage:</span>
                              <span className="num-cell" style={styles.purpleText}>
                                {displayBaseQty}
                              </span>
                            </div>
                            <div style={{ ...styles.auditLine, marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cost Subtotal:</span>
                              <span className="num-cell" style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>
                                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Summary & Place Order */}
                  <div style={styles.cartSummary}>
                    <div style={styles.summaryRow}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Subtotal</span>
                      <span className="num-cell" style={styles.whiteText}>
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>GST (0% Special Trade)</span>
                      <span className="num-cell" style={styles.whiteText}>₹0.00</span>
                    </div>
                    
                    <div style={{ ...styles.summaryRow, borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '16px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>Total Quotation Price</span>
                      <span className="num-cell" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button
                      onClick={handleSubmitQuotation}
                      className="btn btn-primary"
                      style={styles.checkoutBtn}
                      disabled={submitting}
                    >
                      {submitting ? <span className="spinner"></span> : 'Place Quotation Order'}
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '30px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  rightColumn: {
    position: 'sticky',
    top: '100px',
    height: 'fit-content',
  },
  header: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#fff',
  },
  pageSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    marginTop: '4px',
  },
  filterBar: {
    padding: '16px',
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: '1',
    minWidth: '220px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-secondary)',
  },
  searchInput: {
    paddingLeft: '44px',
  },
  selectsContainer: {
    display: 'flex',
    gap: '12px',
  },
  filterSelect: {
    width: '160px',
  },
  loadingContainer: {
    padding: '100px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: '60px',
    textAlign: 'center',
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  productCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'rgba(14, 19, 32, 0.5)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  skuTag: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--primary)',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  categoryTag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  productName: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
  },
  productDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '20px',
    flex: '1',
  },
  productMeta: {
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  metaLabel: {
    color: 'var(--text-secondary)',
  },
  cardBtn: {
    width: '100%',
    height: '40px',
    fontSize: '14px',
  },
  cartCard: {
    padding: '24px',
    background: 'rgba(14, 19, 32, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 140px)',
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  cartContent: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flex: 1,
  },
  cartItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    maxHeight: '350px',
    paddingRight: '4px',
  },
  cartItemRow: {
    padding: '14px',
    borderRadius: '8px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  cartItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    transition: 'color 0.2s',
  },
  removeBtn: {
    color: 'var(--danger)',
  },
  cartItemInputs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  miniLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  miniInput: {
    padding: '8px 10px',
    fontSize: '13px',
  },
  miniSelect: {
    padding: '8px 10px',
    fontSize: '13px',
  },
  auditBlock: {
    padding: '8px',
    background: 'rgba(139, 92, 246, 0.03)',
    border: '1px solid rgba(139, 92, 246, 0.08)',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  auditLine: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  whiteText: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  purpleText: {
    color: 'var(--primary)',
    fontWeight: 'bold',
  },
  cartSummary: {
    borderTop: '1px solid var(--border-glass)',
    paddingTop: '20px',
    marginTop: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '8px',
  },
  checkoutBtn: {
    width: '100%',
    height: '48px',
    marginTop: '20px',
  },
  emptyCart: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '24px',
  },
  cartErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cartSuccessBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
