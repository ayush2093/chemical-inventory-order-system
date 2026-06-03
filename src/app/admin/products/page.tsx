'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Plus, Edit2, Trash2, Search, X, Layers, Percent } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  dimension: 'WEIGHT' | 'VOLUME' | 'COUNT';
  baseUnit: string;
  inventoryBalance: string; // Decimal from Prisma
  basePrice: string; // Decimal from Prisma
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [dimension, setDimension] = useState<'WEIGHT' | 'VOLUME' | 'COUNT'>('WEIGHT');
  const [inventoryQuantity, setInventoryQuantity] = useState('');
  const [inventoryUnit, setInventoryUnit] = useState('kg');
  const [priceRate, setPriceRate] = useState('');
  const [priceUnit, setPriceUnit] = useState('kg');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category) queryParams.append('category', category);
      if (dimensionFilter) queryParams.append('dimension', dimensionFilter);

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products);
    } catch (err: any) {
      setError(err.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category, dimensionFilter]);

  // Sync units dropdowns on dimension change
  useEffect(() => {
    if (dimension === 'WEIGHT') {
      setInventoryUnit('kg');
      setPriceUnit('kg');
    } else if (dimension === 'VOLUME') {
      setInventoryUnit('L');
      setPriceUnit('L');
    } else {
      setInventoryUnit('items');
      setPriceUnit('items');
    }
  }, [dimension]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setDescription('');
    setCategoryInput('');
    setDimension('WEIGHT');
    setInventoryQuantity('');
    setPriceRate('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setSku(product.sku);
    setName(product.name);
    setDescription(product.description || '');
    setCategoryInput(product.category || '');
    setDimension(product.dimension);
    setFormError('');
    
    // When editing, let's load current inventory and price in base units for simplicity or standard display
    // Base units: g for weight, mL for volume, items for count
    if (product.dimension === 'WEIGHT') {
      // Show in kg
      const kgVal = (parseFloat(product.inventoryBalance) / 1000).toString();
      const kgPrice = (parseFloat(product.basePrice) * 1000).toString();
      setInventoryQuantity(kgVal);
      setInventoryUnit('kg');
      setPriceRate(kgPrice);
      setPriceUnit('kg');
    } else if (product.dimension === 'VOLUME') {
      // Show in L
      const lVal = (parseFloat(product.inventoryBalance) / 1000).toString();
      const lPrice = (parseFloat(product.basePrice) * 1000).toString();
      setInventoryQuantity(lVal);
      setInventoryUnit('L');
      setPriceRate(lPrice);
      setPriceUnit('L');
    } else {
      setInventoryQuantity(product.inventoryBalance);
      setInventoryUnit('items');
      setPriceRate(product.basePrice);
      setPriceUnit('items');
    }
    
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const payload = {
      sku,
      name,
      description,
      category: categoryInput,
      dimension,
      inventoryQuantity: parseFloat(inventoryQuantity),
      inventoryUnit,
      priceRate: parseFloat(priceRate),
      priceUnit,
    };

    if (isNaN(payload.inventoryQuantity) || payload.inventoryQuantity < 0) {
      setFormError('Quantity must be a valid non-negative number');
      setSubmitting(false);
      return;
    }
    if (isNaN(payload.priceRate) || payload.priceRate < 0) {
      setFormError('Price rate must be a valid non-negative number');
      setSubmitting(false);
      return;
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete product');
      }
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Error deleting product');
    }
  };

  // Unique categories list for filtering
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <>
      <Navbar />
      <main className="container animate-fade-in" style={{ paddingBottom: '80px', marginTop: '30px' }}>
        
        {/* Header Section */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.pageTitle}>Product Inventory Control</h1>
            <p style={styles.pageSubtitle}>Manage base prices, SKUs, dimensions, and configure stock levels</p>
          </div>
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={18} />
            Create Product
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="glass-panel" style={styles.filterBar}>
          <div style={styles.searchContainer}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by SKU, name, description..."
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
              value={dimensionFilter}
              onChange={(e) => setDimensionFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Dimensions</option>
              <option value="WEIGHT">Weight</option>
              <option value="VOLUME">Volume</option>
              <option value="COUNT">Count</option>
            </select>
          </div>
        </div>

        {/* Error Display */}
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Table Content */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="glass-panel" style={styles.emptyContainer}>
            <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3>No products found</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Try adjusting your filters or create a new product above.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Details</th>
                  <th>Dimension</th>
                  <th>Internal Stock (Base)</th>
                  <th>Alternative Conversion View</th>
                  <th>Pricing Rate (Base / Alternate)</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const bal = parseFloat(product.inventoryBalance);
                  const baseP = parseFloat(product.basePrice);
                  
                  let altStock = '';
                  let altPrice = '';
                  
                  if (product.dimension === 'WEIGHT') {
                    altStock = `${(bal / 1000).toFixed(4)} kg`;
                    altPrice = `${(baseP * 1000).toFixed(2)} INR/kg`;
                  } else if (product.dimension === 'VOLUME') {
                    altStock = `${(bal / 1000).toFixed(4)} L`;
                    altPrice = `${(baseP * 1000).toFixed(2)} INR/L`;
                  } else {
                    altStock = '-';
                    altPrice = '-';
                  }

                  return (
                    <tr key={product.id}>
                      <td className="num-cell" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        {product.sku}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{product.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {product.category || 'Uncategorized'} • {product.description || 'No description'}
                        </div>
                      </td>
                      <td>
                        <span style={styles.dimensionBadge}>
                          {product.dimension}
                        </span>
                      </td>
                      <td className="num-cell">
                        {bal.toFixed(4)} {product.baseUnit}
                      </td>
                      <td className="num-cell" style={{ color: 'var(--text-secondary)' }}>
                        {altStock}
                      </td>
                      <td className="num-cell">
                        <div>{baseP.toFixed(4)} INR/{product.baseUnit}</div>
                        {altPrice !== '-' && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            ({altPrice})
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="btn btn-secondary"
                            style={styles.actionBtn}
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="btn btn-secondary"
                            style={{ ...styles.actionBtn, color: 'var(--danger)' }}
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit Modal Dialog */}
        {isModalOpen && (
          <div style={styles.modalOverlay}>
            <div className="glass-panel animate-fade-in" style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2>{editingProduct ? 'Modify Compound Product' : 'Register New Compound'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>

              {formError && <div style={styles.formErrorBanner}>{formError}</div>}

              <form onSubmit={handleFormSubmit} style={styles.modalForm}>
                <div style={styles.formGrid}>
                  <div>
                    <label htmlFor="modal-sku">SKU Code</label>
                    <input
                      id="modal-sku"
                      type="text"
                      placeholder="e.g., ETH-100"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-name">Product Name</label>
                    <input
                      id="modal-name"
                      type="text"
                      placeholder="e.g., Ethanol 99%"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div>
                    <label htmlFor="modal-category">Category</label>
                    <input
                      id="modal-category"
                      type="text"
                      placeholder="e.g., Solvents"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-dimension">Physical Dimension</label>
                    <select
                      id="modal-dimension"
                      value={dimension}
                      onChange={(e) => setDimension(e.target.value as any)}
                      disabled={submitting || !!editingProduct}
                    >
                      <option value="WEIGHT">Weight</option>
                      <option value="VOLUME">Volume</option>
                      <option value="COUNT">Count (Discrete items)</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGrid}>
                  {/* Inventory block */}
                  <div>
                    <label htmlFor="modal-inventory">Inventory Level</label>
                    <div style={styles.inputGroup}>
                      <input
                        id="modal-inventory"
                        type="number"
                        step="any"
                        placeholder="Quantity"
                        value={inventoryQuantity}
                        onChange={(e) => setInventoryQuantity(e.target.value)}
                        required
                        disabled={submitting}
                      />
                      <select
                        value={inventoryUnit}
                        onChange={(e) => setInventoryUnit(e.target.value)}
                        style={styles.addonSelect}
                        disabled={submitting}
                      >
                        {dimension === 'WEIGHT' && (
                          <>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </>
                        )}
                        {dimension === 'VOLUME' && (
                          <>
                            <option value="L">L</option>
                            <option value="mL">mL</option>
                          </>
                        )}
                        {dimension === 'COUNT' && <option value="items">items</option>}
                      </select>
                    </div>
                  </div>

                  {/* Pricing block */}
                  <div>
                    <label htmlFor="modal-price">Base Price Rate (INR)</label>
                    <div style={styles.inputGroup}>
                      <input
                        id="modal-price"
                        type="number"
                        step="any"
                        placeholder="Rate"
                        value={priceRate}
                        onChange={(e) => setPriceRate(e.target.value)}
                        required
                        disabled={submitting}
                      />
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        style={styles.addonSelect}
                        disabled={submitting}
                      >
                        {dimension === 'WEIGHT' && (
                          <>
                            <option value="kg">per kg</option>
                            <option value="g">per g</option>
                          </>
                        )}
                        {dimension === 'VOLUME' && (
                          <>
                            <option value="L">per L</option>
                            <option value="mL">per mL</option>
                          </>
                        )}
                        {dimension === 'COUNT' && <option value="items">per item</option>}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-description">Description</label>
                  <textarea
                    id="modal-description"
                    placeholder="Provide details about grades, compound purity, hazards..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <span className="spinner"></span> : editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    minWidth: '260px',
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
    marginLeft: 'auto',
  },
  filterSelect: {
    width: '180px',
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
  dimensionBadge: {
    fontSize: '11px',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-secondary)',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    padding: '6px',
    borderRadius: '4px',
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '24px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '650px',
    padding: '32px',
    position: 'relative',
    background: '#0e1320',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
  },
  addonSelect: {
    width: '110px',
    borderLeft: 'none',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  formErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
};
