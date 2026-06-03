'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Clipboard, Eye, Calendar, Tag, ArrowRight, CornerDownRight } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  orderedQuantity: string;
  orderedUnit: string;
  quantityInBaseUnit: string;
  unitPriceInOrderedUnit: string;
  totalItemPrice: string;
  product: {
    sku: string;
    name: string;
    dimension: string;
    baseUnit: string;
  };
}

interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  totalPrice: string;
  createdAt: string;
  items: OrderItem[];
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message || 'Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navbar />
      <main className="container animate-fade-in" style={{ paddingBottom: '80px', marginTop: '30px' }}>
        
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>My Quotation Ledger</h1>
          <p style={styles.pageSubtitle}>Track order statuses and verify calculations of your placed quotation contracts</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div style={styles.loadingContainer}>
            <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading ledger...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-panel" style={styles.emptyContainer}>
            <Clipboard size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3>No orders placed yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Create a quotation on the product catalog page to see it here.
            </p>
          </div>
        ) : (
          <div style={styles.ordersList}>
            {orders.map((order) => (
              <div key={order.id} className="glass-panel" style={styles.orderCard}>
                
                {/* Header row */}
                <div style={styles.orderCardHeader}>
                  <div>
                    <div style={styles.orderMeta}>
                      <span className="num-cell" style={styles.orderId}>
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span style={styles.bullet}>•</span>
                      <span style={styles.timestamp}>
                        <Calendar size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div style={styles.statusRow}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Status: </span>
                      <span className={`badge badge-${order.status}`} style={{ padding: '4px 10px', fontSize: '11px' }}>
                        {order.status === 'pending' ? 'Pending Review' : order.status}
                      </span>
                    </div>
                  </div>

                  <div style={styles.headerRight}>
                    <span style={styles.totalLabel}>Quotation Value</span>
                    <span className="num-cell" style={styles.totalValue}>
                      ₹{parseFloat(order.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Items breakdown list */}
                <div style={styles.itemsSection}>
                  <div style={styles.itemsGrid}>
                    {order.items.map((item) => {
                      const qty = parseFloat(item.orderedQuantity);
                      const baseQty = parseFloat(item.quantityInBaseUnit);
                      const price = parseFloat(item.unitPriceInOrderedUnit);
                      const itemTotal = parseFloat(item.totalItemPrice);

                      return (
                        <div key={item.id} style={styles.itemRow}>
                          <div style={styles.itemDetails}>
                            <div style={styles.itemProduct}>
                              <span className="num-cell" style={styles.itemSku}>{item.product.sku}</span>
                              <span style={styles.productName}>{item.product.name}</span>
                            </div>
                            
                            {/* Conversion chain display */}
                            <div style={styles.conversionChain}>
                              <CornerDownRight size={12} style={{ color: 'var(--primary)', marginTop: '2px' }} />
                              <div style={styles.chainText}>
                                Ordered:{' '}
                                <span className="num-cell" style={styles.highlightText}>
                                  {qty.toFixed(4)} {item.orderedUnit}
                                </span>
                                <ArrowRight size={12} style={{ margin: '0 6px' }} />
                                Storage Equivalent:{' '}
                                <span className="num-cell" style={styles.highlightText}>
                                  {baseQty.toFixed(4)} {item.product.baseUnit}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={styles.itemMath} className="num-cell">
                            <div>
                              {qty.toFixed(4)} {item.orderedUnit} @ ₹{price.toFixed(4)} / {item.orderedUnit}
                            </div>
                            <div style={styles.subtotalText}>
                              ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '28px',
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
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  orderCard: {
    padding: '0',
    overflow: 'hidden',
    background: 'rgba(14, 19, 32, 0.7)',
  },
  orderCardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-glass)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  orderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  orderId: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--primary)',
  },
  bullet: {
    color: 'var(--text-muted)',
  },
  timestamp: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    textAlign: 'right',
  },
  totalLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  totalValue: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#fff',
  },
  itemsSection: {
    padding: '20px 24px',
  },
  itemsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  itemDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  itemProduct: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  itemSku: {
    fontSize: '11px',
    padding: '2px 6px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    color: 'var(--primary)',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  productName: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#fff',
  },
  conversionChain: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
  },
  chainText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  highlightText: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    marginLeft: '3px',
  },
  itemMath: {
    textAlign: 'right',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  subtotalText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: '14px',
    marginTop: '4px',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '14px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '24px',
  },
};
